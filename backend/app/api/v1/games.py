import random
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import AuthResponse, ClaimRouteRequest, CreateGameRequest, GameStateResponse, JoinGameRequest, StartGameRequest
from app.services import game_service
from app.services.realtime_manager import realtime_manager

router = APIRouter(prefix="/games", tags=["games"])
lobbies = {}


def generate_lobby_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


@router.post("/lobbies")
def create_lobby():
    lobby_id = generate_lobby_id()

    lobbies[lobby_id] = {
        "players": []
    }

    return {"lobby_id": lobby_id}


@router.post("/lobbies/{lobby_id}/join")
def join_lobby(lobby_id: str, player_name: str):
    if lobby_id not in lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")

    lobbies[lobby_id]["players"].append(player_name)

    return {
        "message": "Joined lobby",
        "players": lobbies[lobby_id]["players"]
    }

@router.post("", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def create_game(request: CreateGameRequest, db: Session = Depends(get_db)):
    host = game_service.create_game(db, request.name, request.host_name, request.max_players)
    await realtime_manager.broadcast_game_state(host.game_id, game_service.get_game_state(db, host.game_id).model_dump(mode="json"))
    return AuthResponse(game_id=host.game_id, player_id=host.id, player_token=host.token)


@router.post("/{game_id}/join", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def join_game(game_id: str, request: JoinGameRequest, db: Session = Depends(get_db)):
    player = game_service.join_game(db, game_id, request.player_name)
    await realtime_manager.broadcast_game_state(game_id, game_service.get_game_state(db, game_id).model_dump(mode="json"))
    return AuthResponse(game_id=player.game_id, player_id=player.id, player_token=player.token)


@router.get("")
def get_games(db: Session = Depends(get_db)):
    games = game_service.get_games(db)
    return [
        {
            "id": game.id,
            "name": game.name,
            "max_players": game.max_players,
            "current_players": len(game.players),
            "status": game.status.value,
            "created_at": game.created_at,
            "players": [{"id": player.id, "name": player.name} for player in game.players],
        }
        for game in games
    ]

@router.get("/{game_id}", response_model=GameStateResponse)
def get_state(game_id: str, db: Session = Depends(get_db)):
    return game_service.get_game_state(db, game_id)


@router.post("/{game_id}/claim-route", status_code=status.HTTP_204_NO_CONTENT)
async def claim_route(game_id: str, request: ClaimRouteRequest, db: Session = Depends(get_db)):
    game_service.claim_route(db, game_id, request.player_token, request.route_id, request.claim_color)
    await realtime_manager.broadcast_game_state(game_id, game_service.get_game_state(db, game_id).model_dump(mode="json"))
    return None


@router.post("/{game_id}/start", status_code=status.HTTP_204_NO_CONTENT)
async def start_game(game_id: str, request: StartGameRequest, db: Session = Depends(get_db)):
    game_service.start_game(db, game_id, request.host_token)
    await realtime_manager.broadcast_game_state(game_id, game_service.get_game_state(db, game_id).model_dump(mode="json"))
    return None

