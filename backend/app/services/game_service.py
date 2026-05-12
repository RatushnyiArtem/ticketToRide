import json
import random
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ClaimedRoute, Game, GameStatus, Player, Route, Turn, TurnAction
from app.schemas.schemas import GameStateResponse, PlayerResponse, RouteResponse, TurnResponse

TRAIN_CARD_COLORS = [
    "red",
    "blue",
    "green",
    "yellow",
    "black",
    "white",
    "orange",
    "pink",
    "wild",
]

# In-memory runtime state for online matches.
# This fixes the current gameplay problem: the deck, market and hands are shared
# by all websocket clients instead of being generated separately in every browser.
# For production, move these fields into DB tables so the game survives server restart.
_GAME_RUNTIME: dict[str, dict[str, Any]] = {}


def _points_for_length(length: int) -> int:
    mapping = {1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15}
    return mapping.get(length, max(1, length * 2))


def _empty_hand() -> dict[str, int]:
    return {color: 0 for color in TRAIN_CARD_COLORS}


def _make_train_deck() -> list[str]:
    deck: list[str] = []
    for color in TRAIN_CARD_COLORS:
        amount = 14 if color == "wild" else 12
        deck.extend([color] * amount)
    random.shuffle(deck)
    return deck


def _draw_one(runtime: dict[str, Any]) -> str | None:
    deck: list[str] = runtime["deck"]
    if not deck:
        return None
    return deck.pop(0)


def _refill_market(runtime: dict[str, Any]) -> None:
    market: list[str] = runtime["market"]
    discard: list[str] = runtime["discard"]

    while len(market) < 5:
        card = _draw_one(runtime)
        if card is None:
            break
        market.append(card)

    # Ticket to Ride rule: if 3+ locomotives are face-up, discard and redraw.
    # Keep this bounded to avoid infinite loops when the deck is almost empty.
    redraw_attempts = 0
    while market.count("wild") >= 3 and len(runtime["deck"]) >= 5 and redraw_attempts < 3:
        discard.extend(market)
        market.clear()
        while len(market) < 5:
            card = _draw_one(runtime)
            if card is None:
                break
            market.append(card)
        redraw_attempts += 1


def _ensure_runtime_state(db: Session, game_id: str) -> dict[str, Any]:
    game_key = str(game_id)
    if game_key in _GAME_RUNTIME:
        return _GAME_RUNTIME[game_key]

    players = db.scalars(
        select(Player).where(Player.game_id == game_id).order_by(Player.turn_order.asc())
    ).all()

    runtime: dict[str, Any] = {
        "deck": _make_train_deck(),
        "discard": [],
        "market": [],
        "hands": {},
        "cards_drawn_this_turn": 0,
    }

    for player in players:
        hand = _empty_hand()
        for _ in range(4):
            card = _draw_one(runtime)
            if card is not None:
                hand[card] += 1
        runtime["hands"][str(player.id)] = hand

    _refill_market(runtime)
    _GAME_RUNTIME[game_key] = runtime
    return runtime


def _get_players_in_turn_order(db: Session, game_id: str) -> list[Player]:
    return db.scalars(
        select(Player).where(Player.game_id == game_id).order_by(Player.turn_order.asc())
    ).all()


def _get_player_by_token(db: Session, game_id: str, player_token: str) -> Player:
    player = db.scalar(
        select(Player).where(Player.game_id == game_id, Player.token == player_token)
    )
    if not player:
        raise HTTPException(status_code=403, detail="Invalid player token")
    return player


def _validate_started_game(db: Session, game_id: str) -> Game:
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.status != GameStatus.started:
        raise HTTPException(status_code=400, detail="Game is not started")
    return game


def _validate_player_turn(db: Session, game_id: str, player_token: str) -> tuple[Game, Player]:
    game = _validate_started_game(db, game_id)
    player = _get_player_by_token(db, game_id, player_token)

    if str(game.current_player_id) != str(player.id):
        raise HTTPException(status_code=400, detail="Not your turn")

    return game, player


def _advance_turn(db: Session, game_id: str, game: Game, current_player: Player) -> None:
    players = _get_players_in_turn_order(db, game_id)
    if not players:
        raise HTTPException(status_code=400, detail="No players in this game")

    index = next((i for i, item in enumerate(players) if str(item.id) == str(current_player.id)), 0)
    game.current_player_id = players[(index + 1) % len(players)].id

    runtime = _ensure_runtime_state(db, game_id)
    runtime["cards_drawn_this_turn"] = 0

    db.commit()


def _can_pay_with_hand(hand: dict[str, int], color: str, length: int) -> bool:
    if color not in TRAIN_CARD_COLORS:
        return False
    if color == "wild":
        return hand.get("wild", 0) >= length
    return hand.get(color, 0) + hand.get("wild", 0) >= length


def _spend_from_hand(hand: dict[str, int], color: str, length: int) -> None:
    if not _can_pay_with_hand(hand, color, length):
        raise HTTPException(status_code=400, detail="Not enough train cards")

    if color == "wild":
        hand["wild"] -= length
        return

    use_color = min(hand.get(color, 0), length)
    hand[color] = hand.get(color, 0) - use_color
    remaining = length - use_color
    if remaining:
        hand["wild"] = hand.get("wild", 0) - remaining


def create_game(db: Session, name: str, host_name: str, max_players: int) -> Player:
    game = Game(name=name, max_players=max_players)
    db.add(game)
    db.flush()

    host = Player(game_id=game.id, name=host_name, turn_order=1, is_host=True)
    db.add(host)
    db.commit()
    db.refresh(host)
    return host


def get_games(db):
    return db.query(Game).all()


def join_game(db: Session, game_id: str, player_name: str) -> Player:
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.status != GameStatus.waiting:
        raise HTTPException(status_code=400, detail="Game already started")

    players_count = db.scalar(select(func.count(Player.id)).where(Player.game_id == game_id)) or 0
    if players_count >= game.max_players:
        raise HTTPException(status_code=400, detail="Game is full")

    exists = db.scalar(
        select(Player.id).where(Player.game_id == game_id).where(func.lower(Player.name) == player_name.lower())
    )
    if exists:
        raise HTTPException(status_code=400, detail="Player name already used in this game")

    player = Player(game_id=game_id, name=player_name, turn_order=players_count + 1)
    db.add(player)
    db.flush()

    # For online lobby flow: when the last required player joins, start the
    # authoritative backend game immediately. Do not let frontend "fake-start"
    # the board locally, otherwise every browser gets its own deck and turn.
    if players_count + 1 >= game.max_players:
        players = _get_players_in_turn_order(db, game_id)
        game.status = GameStatus.started
        game.current_player_id = players[0].id if players else player.id

    db.commit()
    db.refresh(player)

    if game.status == GameStatus.started:
        _ensure_runtime_state(db, game_id)

    return player


def start_game(db: Session, game_id: str, host_token: str) -> None:
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    host = db.scalar(
        select(Player).where(Player.game_id == game_id, Player.token == host_token, Player.is_host.is_(True))
    )
    if not host:
        raise HTTPException(status_code=403, detail="Only host can start the game")

    players = _get_players_in_turn_order(db, game_id)
    if len(players) < 2:
        raise HTTPException(status_code=400, detail="At least 2 players are required")
    if game.status != GameStatus.waiting:
        raise HTTPException(status_code=400, detail="Game already started")

    game.status = GameStatus.started
    game.current_player_id = players[0].id
    db.commit()

    _ensure_runtime_state(db, game_id)


def end_turn(db: Session, game_id: str, player_token: str) -> None:
    game, player = _validate_player_turn(db, game_id, player_token)
    _advance_turn(db, game_id, game, player)


def finish_game(db: Session, game_id: str, player_token: str) -> None:
    game, player = _validate_player_turn(db, game_id, player_token)
    game.status = GameStatus.finished
    game.current_player_id = None
    db.commit()


def draw_blind_card(db: Session, game_id: str, player_token: str) -> None:
    game, player = _validate_player_turn(db, game_id, player_token)
    runtime = _ensure_runtime_state(db, game_id)

    if runtime["cards_drawn_this_turn"] >= 2:
        raise HTTPException(status_code=400, detail="You already drew two cards this turn")

    card = _draw_one(runtime)
    if card is None:
        raise HTTPException(status_code=400, detail="Deck is empty")

    hand = runtime["hands"].setdefault(str(player.id), _empty_hand())
    hand[card] += 1
    runtime["cards_drawn_this_turn"] += 1

    if runtime["cards_drawn_this_turn"] >= 2:
        _advance_turn(db, game_id, game, player)


def draw_market_card(db: Session, game_id: str, player_token: str, market_index: int) -> None:
    game, player = _validate_player_turn(db, game_id, player_token)
    runtime = _ensure_runtime_state(db, game_id)

    if runtime["cards_drawn_this_turn"] >= 2:
        raise HTTPException(status_code=400, detail="You already drew two cards this turn")

    market: list[str] = runtime["market"]
    if market_index < 0 or market_index >= len(market):
        raise HTTPException(status_code=400, detail="Invalid market card index")

    card = market[market_index]
    if card == "wild" and runtime["cards_drawn_this_turn"] > 0:
        raise HTTPException(status_code=400, detail="A locomotive can only be taken as the first card of the turn")

    hand = runtime["hands"].setdefault(str(player.id), _empty_hand())
    hand[card] += 1
    market.pop(market_index)
    _refill_market(runtime)

    if card == "wild":
        _advance_turn(db, game_id, game, player)
        return

    runtime["cards_drawn_this_turn"] += 1
    if runtime["cards_drawn_this_turn"] >= 2:
        _advance_turn(db, game_id, game, player)


def claim_route(
    db: Session,
    game_id: str,
    player_token: str,
    route_id: int,
    claim_color: str | None = None,
) -> None:
    game, player = _validate_player_turn(db, game_id, player_token)
    runtime = _ensure_runtime_state(db, game_id)

    route = db.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    already_claimed = db.scalar(
        select(ClaimedRoute.id).where(ClaimedRoute.game_id == game_id, ClaimedRoute.route_id == route_id)
    )
    if already_claimed:
        raise HTTPException(status_code=400, detail="Route already claimed")

    if player.train_cars_left < route.length:
        raise HTTPException(status_code=400, detail="Not enough train cars")

    color = claim_color or getattr(route, "color", None)
    if not color:
        raise HTTPException(status_code=400, detail="claim_color is required")

    hand = runtime["hands"].setdefault(str(player.id), _empty_hand())
    _spend_from_hand(hand, str(color), route.length)

    claim = ClaimedRoute(game_id=game_id, route_id=route.id, player_id=player.id)
    db.add(claim)

    player.train_cars_left -= route.length
    player.score += _points_for_length(route.length)

    payload = json.dumps({
        "route_id": route.id,
        "city_a": route.city_a,
        "city_b": route.city_b,
        "claim_color": color,
    })
    turn = Turn(game_id=game_id, player_id=player.id, action=TurnAction.claim_route, payload=payload)
    db.add(turn)

    _advance_turn(db, game_id, game, player)


def get_game_state(db: Session, game_id: str) -> GameStateResponse:
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    players = _get_players_in_turn_order(db, game_id)
    routes = db.scalars(select(Route).order_by(Route.id.asc())).all()
    claims = db.scalars(select(ClaimedRoute).where(ClaimedRoute.game_id == game_id)).all()
    turns = db.scalars(select(Turn).where(Turn.game_id == game_id).order_by(Turn.id.asc())).all()

    claimed_map = {claim.route_id: claim.player_id for claim in claims}
    route_payload = [
        RouteResponse(
            id=route.id,
            city_a=route.city_a,
            city_b=route.city_b,
            length=route.length,
            points=route.points,
            claimed_by_player_id=claimed_map.get(route.id),
        )
        for route in routes
    ]

    return GameStateResponse(
        id=game.id,
        name=game.name,
        status=game.status.value,
        max_players=game.max_players,
        current_player_id=game.current_player_id,
        players=[
            PlayerResponse(
                id=player.id,
                name=player.name,
                score=player.score,
                train_cars_left=player.train_cars_left,
                turn_order=player.turn_order,
            )
            for player in players
        ],
        routes=route_payload,
        turns=[
            TurnResponse(
                id=turn.id,
                player_id=turn.player_id,
                action=turn.action.value,
                payload=turn.payload,
                created_at=turn.created_at,
            )
            for turn in turns
        ],
    )


def get_realtime_game_state(db: Session, game_id: str, viewer_token: str | None = None) -> dict[str, Any]:
    base_state = get_game_state(db, game_id).model_dump(mode="json")
    game = db.get(Game, game_id)

    runtime = None
    if game and game.status == GameStatus.started:
        runtime = _ensure_runtime_state(db, game_id)

    viewer: Player | None = None
    if viewer_token:
        viewer = db.scalar(
            select(Player).where(Player.game_id == game_id, Player.token == viewer_token)
        )

    if runtime is None:
        base_state.update({
            "deck_count": 0,
            "market": [],
            "cards_drawn_this_turn": 0,
            "own_player_id": str(viewer.id) if viewer else None,
            "own_hand": _empty_hand(),
        })
        return base_state

    hands: dict[str, dict[str, int]] = runtime["hands"]
    for player_payload in base_state.get("players", []):
        player_id = str(player_payload["id"])
        player_payload["hand_count"] = sum(hands.get(player_id, _empty_hand()).values())

    own_hand = hands.get(str(viewer.id), _empty_hand()) if viewer else _empty_hand()
    base_state.update({
        "deck_count": len(runtime["deck"]),
        "market": list(runtime["market"]),
        "cards_drawn_this_turn": runtime["cards_drawn_this_turn"],
        "own_player_id": str(viewer.id) if viewer else None,
        "own_hand": dict(own_hand),
    })
    return base_state