import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class GameStatus(str, enum.Enum):
    waiting = "waiting"
    started = "started"
    finished = "finished"


class Game(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[GameStatus] = mapped_column(Enum(GameStatus), default=GameStatus.waiting, nullable=False)
    max_players: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    current_player_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("players.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    players: Mapped[list["Player"]] = relationship("Player", back_populates="game", foreign_keys="Player.game_id")
    claims: Mapped[list["ClaimedRoute"]] = relationship("ClaimedRoute", back_populates="game")
    turns: Mapped[list["Turn"]] = relationship("Turn", back_populates="game")


class Player(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id: Mapped[str] = mapped_column(String(36), ForeignKey("games.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    token: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    train_cars_left: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    turn_order: Mapped[int] = mapped_column(Integer, nullable=False)
    is_host: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    game: Mapped[Game] = relationship("Game", back_populates="players", foreign_keys=[game_id])


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    city_a: Mapped[str] = mapped_column(String(80), nullable=False)
    city_b: Mapped[str] = mapped_column(String(80), nullable=False)
    length: Mapped[int] = mapped_column(Integer, nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)


class ClaimedRoute(Base):
    __tablename__ = "claimed_routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(String(36), ForeignKey("games.id"), nullable=False, index=True)
    route_id: Mapped[int] = mapped_column(Integer, ForeignKey("routes.id"), nullable=False)
    player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    game: Mapped[Game] = relationship("Game", back_populates="claims")
    route: Mapped[Route] = relationship("Route")
    player: Mapped[Player] = relationship("Player")


class TurnAction(str, enum.Enum):
    claim_route = "claim_route"


class Turn(Base):
    __tablename__ = "turns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(String(36), ForeignKey("games.id"), nullable=False, index=True)
    player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"), nullable=False)
    action: Mapped[TurnAction] = mapped_column(Enum(TurnAction), nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    game: Mapped[Game] = relationship("Game", back_populates="turns")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    auth_token: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


