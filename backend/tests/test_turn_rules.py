from fastapi.testclient import TestClient

from app.db.session import SessionLocal, init_db
from app.main import app
from app.services.game_service import get_realtime_game_state
from app.services.route_utils import find_route_id, pick_claim_color


def test_claim_route_changes_turn_and_score():
    init_db(reset=True)
    with TestClient(app) as client:
        host = client.post(
            "/api/v1/games",
            json={"name": "Turns Demo", "host_name": "Host", "max_players": 3},
        ).json()
        player2 = client.post(f"/api/v1/games/{host['game_id']}/join", json={"player_name": "Player2"}).json()

        client.post(f"/api/v1/games/{host['game_id']}/start", json={"host_token": host["player_token"]})

        with SessionLocal() as db:
            state = get_realtime_game_state(db, host["game_id"], host["player_token"])

        route_id = find_route_id(state["routes"], "vienna", "budapest", 1)

        claim = client.post(
            f"/api/v1/games/{host['game_id']}/claim-route",
            json={
                "player_token": host["player_token"],
                "route_id": route_id,
                "claim_color": pick_claim_color(state["own_hand"]),
            },
        )
        assert claim.status_code == 204

        state = client.get(f"/api/v1/games/{host['game_id']}").json()
        host_state = next(p for p in state["players"] if p["id"] == host["player_id"])

        assert host_state["score"] > 0
        assert host_state["train_cars_left"] < 45
        assert state["current_player_id"] == player2["player_id"]


def test_reject_claim_if_not_players_turn():
    init_db(reset=True)
    with TestClient(app) as client:
        host = client.post(
            "/api/v1/games",
            json={"name": "Rule Demo", "host_name": "Host", "max_players": 3},
        ).json()
        player2 = client.post(f"/api/v1/games/{host['game_id']}/join", json={"player_name": "Player2"}).json()

        client.post(f"/api/v1/games/{host['game_id']}/start", json={"host_token": host["player_token"]})

        with SessionLocal() as db:
            state = get_realtime_game_state(db, host["game_id"], host["player_token"])

        route_id = find_route_id(state["routes"], "vienna", "budapest", 1)

        bad_turn = client.post(
            f"/api/v1/games/{host['game_id']}/claim-route",
            json={
                "player_token": player2["player_token"],
                "route_id": route_id,
                "claim_color": pick_claim_color(state["own_hand"]),
            },
        )
        assert bad_turn.status_code == 400
        assert "Not your turn" in bad_turn.json()["detail"]

