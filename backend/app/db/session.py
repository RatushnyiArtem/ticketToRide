import os
import time

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from ticketToRide.backend.app.core.config import settings
from ticketToRide.backend.app.db.base import Base
from ticketToRide.backend.app.models import Route

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

DEFAULT_ROUTES: list[dict[str, int | str]] = [
    {"city_a": "Kyiv", "city_b": "Lviv", "length": 4, "points": 7},
    {"city_a": "Kyiv", "city_b": "Odessa", "length": 5, "points": 10},
    {"city_a": "Warsaw", "city_b": "Krakow", "length": 3, "points": 4},
    {"city_a": "Berlin", "city_b": "Prague", "length": 4, "points": 7},
    {"city_a": "Prague", "city_b": "Vienna", "length": 2, "points": 2},
    {"city_a": "Budapest", "city_b": "Bucharest", "length": 4, "points": 7},
]


def _reset_sqlite_file(db_path: str, retries: int = 5, delay: float = 0.15) -> bool:
    if not db_path or db_path == ":memory:" or not os.path.exists(db_path):
        return True

    for attempt in range(retries):
        try:
            os.remove(db_path)
            return True
        except PermissionError:
            if attempt == retries - 1:
                return False
            time.sleep(delay)
    return False


def seed_routes_if_needed(session: Session) -> None:
    existing = session.scalar(select(Route.id).limit(1))
    if existing:
        return
    for route_data in DEFAULT_ROUTES:
        session.add(Route(**route_data))
    session.commit()


def init_db(reset: bool = False) -> None:
    if reset:
        if settings.database_url.startswith("sqlite:///"):
            engine.dispose()
            db_path = settings.database_url.replace("sqlite:///", "", 1)
            removed = _reset_sqlite_file(db_path)
            if not removed:
                # Fallback when db file is temporarily locked (common on Windows).
                Base.metadata.drop_all(bind=engine)
        else:
            Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_routes_if_needed(session)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



