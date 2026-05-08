import json

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ClaimedRoute, Game, GameStatus, Player, Route, Turn, TurnAction
from app.schemas.schemas import GameStateResponse, PlayerResponse, RouteResponse, TurnResponse


def _points_for_length(length: int) -> int:
    mapping = {1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15}
    return mapping.get(length, max(1, length * 2))


def create_game(db: Session, name: str, host_name: str, max_players: int) -> Player:
    game = Game(name=name, max_players=max_players)
    db.add(game)
    db.flush()

    host = Player(game_id=game.id, name=host_name, turn_order=1, is_host=True)
    db.add(host)
    db.commit()
    db.refresh(host)
    return host


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
    db.commit()
    db.refresh(player)
    return player


def start_game(db: Session, game_id: str, host_token: str) -> None:
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    host = db.scalar(select(Player).where(Player.game_id == game_id, Player.token == host_token, Player.is_host.is_(True)))
    if not host:
        raise HTTPException(status_code=403, detail="Only host can start the game")

    players = db.scalars(select(Player).where(Player.game_id == game_id).order_by(Player.turn_order.asc())).all()
    if len(players) < 2:
        raise HTTPException(status_code=400, detail="At least 2 players are required")
    if game.status != GameStatus.waiting:
        raise HTTPException(status_code=400, detail="Game already started")

    game.status = GameStatus.started
    game.current_player_id = players[0].id
    db.commit()


def claim_route(db: Session, game_id: str, player_token: str, route_id: int) -> None:
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.status != GameStatus.started:
        raise HTTPException(status_code=400, detail="Game is not started")

    player = db.scalar(select(Player).where(Player.game_id == game_id, Player.token == player_token))
    if not player:
        raise HTTPException(status_code=403, detail="Invalid player token")
    if game.current_player_id != player.id:
        raise HTTPException(status_code=400, detail="Not your turn")

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

    claim = ClaimedRoute(game_id=game_id, route_id=route.id, player_id=player.id)
    db.add(claim)

    player.train_cars_left -= route.length
    player.score += _points_for_length(route.length)

    payload = json.dumps({"route_id": route.id, "city_a": route.city_a, "city_b": route.city_b})
    turn = Turn(game_id=game_id, player_id=player.id, action=TurnAction.claim_route, payload=payload)
    db.add(turn)

    players = db.scalars(select(Player).where(Player.game_id == game_id).order_by(Player.turn_order.asc())).all()
    index = next((i for i, item in enumerate(players) if item.id == player.id), 0)
    game.current_player_id = players[(index + 1) % len(players)].id
    db.commit()


def get_game_state(db: Session, game_id: str) -> GameStateResponse:
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    players = db.scalars(select(Player).where(Player.game_id == game_id).order_by(Player.turn_order.asc())).all()
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

