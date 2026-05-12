import os
import time
from collections import Counter

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.models import Route
from app.services.route_utils import route_key

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

ROUTE_POINTS: dict[int, int] = {1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15}

DEFAULT_ROUTE_SPECS: list[tuple[str, str, int]] = [
    ("edinburgh", "london", 4),
    ("london", "amsterdam", 2),
    ("london", "amsterdam", 2),
    ("london", "dieppe", 2),
    ("brest", "dieppe", 2),
    ("brest", "paris", 3),
    ("dieppe", "paris", 1),
    ("dieppe", "paris", 1),
    ("dieppe", "bruxelles", 2),
    ("bruxelles", "amsterdam", 1),
    ("bruxelles", "paris", 2),
    ("bruxelles", "paris", 2),
    ("amsterdam", "essen", 3),
    ("essen", "berlin", 2),
    ("essen", "berlin", 2),
    ("essen", "frankfurt", 2),
    ("frankfurt", "berlin", 3),
    ("frankfurt", "berlin", 3),
    ("paris", "frankfurt", 3),
    ("paris", "zurich", 3),
    ("paris", "pamplona", 4),
    ("paris", "pamplona", 4),
    ("pamplona", "madrid", 3),
    ("pamplona", "madrid", 3),
    ("madrid", "lisboa", 3),
    ("lisboa", "cadiz", 2),
    ("lisboa", "cadiz", 2),
    ("madrid", "cadiz", 3),
    ("pamplona", "barcelona", 2),
    ("barcelona", "madrid", 2),
    ("pamplona", "marseille", 4),
    ("barcelona", "marseille", 4),
    ("marseille", "zurich", 2),
    ("marseille", "roma", 4),
    ("zurich", "frankfurt", 2),
    ("zurich", "munich", 2),
    ("zurich", "venezia", 2),
    ("munich", "frankfurt", 2),
    ("munich", "vienna", 3),
    ("munich", "venezia", 2),
    ("venezia", "vienna", 2),
    ("venezia", "roma", 2),
    ("roma", "palermo", 4),
    ("roma", "brindisi", 2),
    ("palermo", "brindisi", 3),
    ("brindisi", "athens", 4),
    ("palermo", "smyrna", 6),
    ("vienna", "budapest", 1),
    ("vienna", "warsaw", 4),
    ("berlin", "warsaw", 4),
    ("berlin", "danzig", 4),
    ("copenhagen", "berlin", 3),
    ("stockholm", "copenhagen", 3),
    ("stockholm", "copenhagen", 3),
    ("stockholm", "riga", 4),
    ("riga", "danzig", 2),
    ("riga", "wilno", 4),
    ("riga", "petrograd", 4),
    ("petrograd", "moscow", 4),
    ("wilno", "warsaw", 3),
    ("wilno", "smolensk", 3),
    ("smolensk", "moscow", 2),
    ("danzig", "warsaw", 2),
    ("warsaw", "kyiv", 4),
    ("smolensk", "kyiv", 3),
    ("smolensk", "kharkov", 3),
    ("kyiv", "bucharest", 4),
    ("kyiv", "kharkov", 4),
    ("kharkov", "moscow", 4),
    ("kharkov", "rostov", 2),
    ("rostov", "sochi", 2),
    ("sochi", "erzurum", 3),
    ("sevastopol", "rostov", 2),
    ("sevastopol", "constantinople", 5),
    ("erzurum", "angora", 3),
    ("angora", "constantinople", 2),
    ("constantinople", "smyrna", 2),
    ("smyrna", "athens", 2),
    ("athens", "sofia", 3),
    ("sofia", "constantinople", 3),
    ("bucharest", "sofia", 2),
    ("budapest", "bucharest", 4),
    ("budapest", "sofia", 4),
    ("budapest", "zagreb", 2),
    ("venezia", "zagreb", 2),
    ("zagreb", "sarajevo", 3),
    ("sarajevo", "sofia", 2),
    ("sarajevo", "athens", 4),
]

DEFAULT_ROUTES: list[dict[str, int | str]] = [
    {"city_a": city_a, "city_b": city_b, "length": length, "points": ROUTE_POINTS[length]}
    for city_a, city_b, length in DEFAULT_ROUTE_SPECS
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
    required_counts = Counter(route_key(city_a, city_b, length) for city_a, city_b, length in DEFAULT_ROUTE_SPECS)
    existing_counts = Counter(
        route_key(route.city_a, route.city_b, route.length) for route in session.scalars(select(Route)).all()
    )

    missing_routes: list[Route] = []
    for city_a, city_b, length in DEFAULT_ROUTE_SPECS:
        key = route_key(city_a, city_b, length)
        if existing_counts[key] < required_counts[key]:
            missing_routes.append(
                Route(city_a=city_a, city_b=city_b, length=length, points=ROUTE_POINTS[length])
            )
            existing_counts[key] += 1

    if not missing_routes:
        return

    session.add_all(missing_routes)
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



