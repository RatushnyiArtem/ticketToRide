from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import AuthResponse, ClaimRouteRequest, CreateGameRequest, GameStateResponse, JoinGameRequest, StartGameRequest
from app.services import game_service

router = APIRouter(prefix="/games", tags=["games"])


@router.post("", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def create_game(request: CreateGameRequest, db: Session = Depends(get_db)):
    host = game_service.create_game(db, request.name, request.host_name, request.max_players)
    return AuthResponse(game_id=host.game_id, player_id=host.id, player_token=host.token)


@router.post("/{game_id}/join", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def join_game(game_id: str, request: JoinGameRequest, db: Session = Depends(get_db)):
    player = game_service.join_game(db, game_id, request.player_name)
    return AuthResponse(game_id=player.game_id, player_id=player.id, player_token=player.token)


@router.post("/{game_id}/start", status_code=status.HTTP_204_NO_CONTENT)
def start_game(game_id: str, request: StartGameRequest, db: Session = Depends(get_db)):
    game_service.start_game(db, game_id, request.host_token)
    return None


@router.get("/{game_id}", response_model=GameStateResponse)
def get_state(game_id: str, db: Session = Depends(get_db)):
    return game_service.get_game_state(db, game_id)


@router.post("/{game_id}/claim-route", status_code=status.HTTP_204_NO_CONTENT)
def claim_route(game_id: str, request: ClaimRouteRequest, db: Session = Depends(get_db)):
    game_service.claim_route(db, game_id, request.player_token, request.route_id)
    return None

