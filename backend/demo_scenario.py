from pprint import pprint

from fastapi.testclient import TestClient

from ticketToRide.backend.app.db.session import init_db
from ticketToRide.backend.app.main import app


if __name__ == "__main__":
    init_db(reset=True)
    client = TestClient(app)

    host = client.post(
        "/api/v1/games",
        json={"name": "Teacher Demo", "host_name": "Volodymyr", "max_players": 4},
    ).json()
    player2 = client.post(f"/api/v1/games/{host['game_id']}/join", json={"player_name": "Ira"}).json()

    client.post(f"/api/v1/games/{host['game_id']}/start", json={"host_token": host["player_token"]})
    client.post(
        f"/api/v1/games/{host['game_id']}/claim-route",
        json={"player_token": host["player_token"], "route_id": 1},
    )

    state = client.get(f"/api/v1/games/{host['game_id']}").json()
    print("Host token:", host["player_token"])
    print("Second player token:", player2["player_token"])
    pprint(state)

