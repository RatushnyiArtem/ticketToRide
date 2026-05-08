# Ticket to Ride - Backend MVP

Starter backend for an online Ticket to Ride style project.
Built with FastAPI + SQLAlchemy + SQLite.

## What is implemented

- game creation with host
- player join
- game start by host token
- current game state endpoint
- one basic turn action: claim route
- turn order, score, and train cars updates
- real-time WebSocket sync for each `game_id`
- user auth routes: register, login, me, logout (HttpOnly cookie token)
- seeded demo routes in SQLite

## Stack

- FastAPI
- SQLAlchemy 2.x
- SQLite
- Pytest + FastAPI TestClient

## Quick start

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Open Swagger: http://127.0.0.1:8000/docs

## API flow for demo

1. `POST /api/v1/games` - create game and get host token
2. `POST /api/v1/games/{game_id}/join` - add second player
3. `POST /api/v1/games/{game_id}/start` - start by host token
4. `POST /api/v1/games/{game_id}/claim-route` - make one turn
5. `GET /api/v1/games/{game_id}` - show updated state

## Real-time multiplayer

- WebSocket endpoint: `ws://127.0.0.1:8000/api/v1/realtime/games/{game_id}?token=<player_token>`
- On connect it sends a `game_state` snapshot immediately.
- After `join`, `start`, or `claim-route`, all connected clients receive a fresh `game_state` broadcast.
- The frontend online flow is: `login/signup` → `/lobby` → `/game/{game_id}`.

## Auth endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me` (token from HttpOnly cookie)
- `POST /api/v1/auth/logout` (clears auth cookie)

`register` and `login` return token in JSON for compatibility, but also set `HttpOnly` auth cookie.
`me` reads cookie first and still supports `Authorization: Bearer <token>` fallback.

## Run tests

```powershell
pytest -q
```

## Demo script

```powershell
python demo_scenario.py
```

It resets DB, runs a short game flow, and prints final state.

## Next steps after MVP

- add draw train cards action
- add destination tickets and completion scoring
- add authentication (JWT) and game lobby permissions

