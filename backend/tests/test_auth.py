from fastapi.testclient import TestClient

from app.db.session import init_db
from app.main import app


def test_register_and_me_flow():
    init_db(reset=True)
    with TestClient(app) as client:
        register = client.post(
            "/api/v1/auth/register",
            json={"username": "volodymyr", "email": "v@example.com", "password": "secret123"},
        )
        assert register.status_code == 201
        assert "ttr_auth_token=" in (register.headers.get("set-cookie") or "")
        assert "HttpOnly" in (register.headers.get("set-cookie") or "")

        me = client.get("/api/v1/auth/me")
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

        me_by_cookie = client.get("/api/v1/auth/me")
        assert me_by_cookie.status_code == 200
        assert me_by_cookie.json()["username"] == "ira"

        client.cookies.clear()
        bad_me = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer bad-token"})
        assert bad_me.status_code == 401


def test_me_supports_bearer_fallback_and_logout_clears_cookie():
    init_db(reset=True)
    with TestClient(app) as client:
        register = client.post(
            "/api/v1/auth/register",
            json={"username": "oleg", "email": "o@example.com", "password": "secret123"},
        )
        token = register.json()["token"]

        client.cookies.clear()
        me_by_header = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_by_header.status_code == 200

        login = client.post("/api/v1/auth/login", json={"username": "oleg", "password": "secret123"})
        assert login.status_code == 200
        logout = client.post("/api/v1/auth/logout")
        assert logout.status_code == 204

        me_after_logout = client.get("/api/v1/auth/me")
        assert me_after_logout.status_code == 401


