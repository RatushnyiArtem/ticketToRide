from datetime import datetime

from pydantic import BaseModel, Field


class CreateGameRequest(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    host_name: str = Field(min_length=2, max_length=60)
    max_players: int = Field(default=5, ge=2, le=5)

class Lobby:
    id: str
    players: list

class JoinGameRequest(BaseModel):
    player_name: str = Field(min_length=2, max_length=60)


class StartGameRequest(BaseModel):
    host_token: str


class ClaimRouteRequest(BaseModel):
    player_token: str
    route_id: int


class PlayerResponse(BaseModel):
    id: str
    name: str
    score: int
    train_cars_left: int
    turn_order: int


class RouteResponse(BaseModel):
    id: int
    city_a: str
    city_b: str
    length: int
    points: int
    claimed_by_player_id: str | None = None


class TurnResponse(BaseModel):
    id: int
    player_id: str
    action: str
    payload: str
    created_at: datetime


class GameStateResponse(BaseModel):
    id: str
    name: str
    status: str
    max_players: int
    current_player_id: str | None
    players: list[PlayerResponse]
    routes: list[RouteResponse]
    turns: list[TurnResponse]


class AuthResponse(BaseModel):
    game_id: str
    player_id: str
    player_token: str


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=6, max_length=128)


class UserAuthResponse(BaseModel):
    user_id: str
    username: str
    email: str
    token: str


class MeResponse(BaseModel):
    user_id: str
    username: str
    email: str


