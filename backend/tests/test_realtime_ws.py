from fastapi.testclient import TestClient

from app.db.session import init_db
from app.main import app


def test_websocket_receives_live_game_updates():
    init_db(reset=True)
    with TestClient(app) as client:
        host = client.post(
            "/api/v1/games",
            json={"name": "WS Demo", "host_name": "Host", "max_players": 4},
        ).json()

        with client.websocket_connect(f"/api/v1/realtime/games/{host['game_id']}?token={host['player_token']}") as ws:
            initial = ws.receive_json()
            assert initial["type"] == "game_state"
            assert initial["payload"]["status"] == "waiting"
            assert len(initial["payload"]["players"]) == 1

            presence = ws.receive_json()
            assert presence["type"] == "presence"
            assert presence["payload"]["connected"] == 1

            player2 = client.post(f"/api/v1/games/{host['game_id']}/join", json={"player_name": "Player2"}).json()
            joined_state = ws.receive_json()
            assert joined_state["type"] == "game_state"
            assert len(joined_state["payload"]["players"]) == 2

            ws.send_json({"type": "start_game", "host_token": host["player_token"]})
            started_state = ws.receive_json()
            assert started_state["type"] == "game_state"
            assert started_state["payload"]["status"] == "started"
            assert started_state["payload"]["current_player_id"] == host["player_id"]

            ws.send_json({"type": "claim_route", "player_token": host["player_token"], "route_id": 1})
            claimed_state = ws.receive_json()
            assert claimed_state["type"] == "game_state"
            assert claimed_state["payload"]["current_player_id"] == player2["player_id"]


def test_websocket_invalid_claim_keeps_connection_open():
    init_db(reset=True)
    with TestClient(app) as client:
        host = client.post(
            "/api/v1/games",
            json={"name": "WS Invalid Claim", "host_name": "Host", "max_players": 4},
        ).json()

        with client.websocket_connect(f"/api/v1/realtime/games/{host['game_id']}?token={host['player_token']}") as ws:
            ws.receive_json()
            ws.receive_json()

            ws.send_json({"type": "start_game", "host_token": host["player_token"]})
            ws.receive_json()

            ws.send_json({"type": "claim_route", "player_token": host["player_token"], "route_id": "bad"})
            error_message = ws.receive_json()
            assert error_message["type"] == "error"

            ws.send_json({"type": "request_state"})
            state = ws.receive_json()
            assert state["type"] == "game_state"


