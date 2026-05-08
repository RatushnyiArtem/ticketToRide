from fastapi.testclient import TestClient

from ticketToRide.backend.app.db.session import init_db
from ticketToRide.backend.app.main import app


def test_healthcheck():
    init_db(reset=True)
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_create_join_start_game_flow():
    init_db(reset=True)
    with TestClient(app) as client:
        create = client.post(
            "/api/v1/games",
            json={"name": "Demo Game", "host_name": "Host", "max_players": 4},
        )
        assert create.status_code == 201
        host_data = create.json()

        join = client.post(f"/api/v1/games/{host_data['game_id']}/join", json={"player_name": "Player2"})
        assert join.status_code == 201

        start = client.post(
            f"/api/v1/games/{host_data['game_id']}/start",
            json={"host_token": host_data["player_token"]},
        )
        assert start.status_code == 204

        state = client.get(f"/api/v1/games/{host_data['game_id']}")
        assert state.status_code == 200
        payload = state.json()
        assert payload["status"] == "started"
        assert len(payload["players"]) == 2

