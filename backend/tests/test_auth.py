from fastapi.testclient import TestClient

from ticketToRide.backend.app.db.session import init_db
from ticketToRide.backend.app.main import app


def test_register_and_me_flow():
    init_db(reset=True)
    with TestClient(app) as client:
        register = client.post(
            "/api/v1/auth/register",
            json={"username": "volodymyr", "email": "v@example.com", "password": "secret123"},
        )
        assert register.status_code == 201

        payload = register.json()
        me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {payload['token']}"})
        assert me.status_code == 200
        assert me.json()["username"] == "volodymyr"


def test_login_and_invalid_token():
    init_db(reset=True)
    with TestClient(app) as client:
        client.post(
            "/api/v1/auth/register",
            json={"username": "ira", "email": "i@example.com", "password": "secret123"},
        )

        login = client.post("/api/v1/auth/login", json={"username": "ira", "password": "secret123"})
        assert login.status_code == 200
        assert login.json()["token"]

        bad_me = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer bad-token"})
        assert bad_me.status_code == 401

