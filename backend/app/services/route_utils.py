from __future__ import annotations

import unicodedata
from collections.abc import Iterable, Mapping
from typing import Any

_CITY_TRANSLATIONS = str.maketrans(
    {
        "ø": "o",
        "Ø": "o",
        "å": "a",
        "Å": "a",
        "æ": "ae",
        "Æ": "ae",
        "œ": "oe",
        "Œ": "oe",
        "ß": "ss",
    }
)

_CITY_ALIASES = {
    "kobenhavn": "copenhagen",
    "kbenhavn": "copenhagen",
    "copenhagen": "copenhagen",
    "moskva": "moscow",
    "moscow": "moscow",
    "warszawa": "warsaw",
    "warsaw": "warsaw",
    "bucurersti": "bucharest",
    "bucuresti": "bucharest",
    "bucharest": "bucharest",
    "wien": "vienna",
    "vienna": "vienna",
    "munchen": "munich",
    "munich": "munich",
    "athina": "athens",
    "athens": "athens",
    "zagrab": "zagreb",
    "zagreb": "zagreb",
    "venice": "venezia",
    "venezia": "venezia",
    "rome": "roma",
    "roma": "roma",
}


def normalize_city_text(value: str) -> str:
    translated = value.translate(_CITY_TRANSLATIONS)
    normalized = unicodedata.normalize("NFD", translated.casefold())
    stripped = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return "".join(ch for ch in stripped if ch.isalnum())


def canonical_city_name(value: str) -> str:
    normalized = normalize_city_text(value)
    return _CITY_ALIASES.get(normalized, normalized)


def route_key(city_a: str, city_b: str, length: int) -> tuple[str, str, int]:
    a = canonical_city_name(city_a)
    b = canonical_city_name(city_b)
    first, second = sorted((a, b))
    return first, second, int(length)


def find_route_id(routes: Iterable[Mapping[str, Any]], city_a: str, city_b: str, length: int) -> int:
    target_key = route_key(city_a, city_b, length)

    for route in routes:
        route_id = route.get("id")
        if route_id is None:
            continue

        route_city_a = str(route.get("city_a", ""))
        route_city_b = str(route.get("city_b", ""))
        route_length = int(route.get("length", 0))

        if route_key(route_city_a, route_city_b, route_length) == target_key:
            return int(route_id)

    raise AssertionError(f"Route {city_a}-{city_b} length {length} not found")


def pick_claim_color(hand: Mapping[str, Any]) -> str:
    for color in ("red", "blue", "green", "yellow", "black", "white", "orange", "pink", "wild"):
        if int(hand.get(color, 0) or 0) > 0:
            return color

    raise AssertionError("No claimable card found in hand")

