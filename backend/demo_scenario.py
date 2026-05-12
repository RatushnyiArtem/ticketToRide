from pprint import pprint

from fastapi.testclient import TestClient

from app.db.session import SessionLocal, init_db
from app.main import app
from app.services.game_service import get_realtime_game_state
from app.services.route_utils import find_route_id, pick_claim_color


if __name__ == "__main__":
    init_db(reset=True)
    client = TestClient(app)

    host = client.post(
        "/api/v1/games",
        json={"name": "Teacher Demo", "host_name": "Volodymyr", "max_players": 4},
    ).json()
    player2 = client.post(f"/api/v1/games/{host['game_id']}/join", json={"player_name": "Ira"}).json()

    client.post(f"/api/v1/games/{host['game_id']}/start", json={"host_token": host["player_token"]})

    with SessionLocal() as db:
        state_before_claim = get_realtime_game_state(db, host["game_id"], host["player_token"])

    route_id = find_route_id(state_before_claim["routes"], "vienna", "budapest", 1)
    claim_color = pick_claim_color(state_before_claim["own_hand"])
    client.post(
        f"/api/v1/games/{host['game_id']}/claim-route",
        json={"player_token": host["player_token"], "route_id": route_id, "claim_color": claim_color},
    )

    state = client.get(f"/api/v1/games/{host['game_id']}").json()
    print("Host token:", host["player_token"])
    print("Second player token:", player2["player_token"])
    pprint(state)

