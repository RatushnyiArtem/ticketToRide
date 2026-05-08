from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Player
from app.schemas import ClaimRouteRequest, StartGameRequest
from app.services import game_service
from app.services.game_service import get_game_state
from app.services.realtime_manager import realtime_manager

router = APIRouter(prefix="/realtime", tags=["realtime"])


async def _send_error(websocket: WebSocket, detail: str) -> None:
    await websocket.send_json({"type": "error", "payload": {"detail": detail}})


async def _broadcast_state(game_id: str, db: Session) -> None:
    await realtime_manager.broadcast_game_state(game_id, get_game_state(db, game_id).model_dump(mode="json"))


async def _handle_start_game(websocket: WebSocket, game_id: str, db: Session, message: dict) -> None:
    try:
        request = StartGameRequest(host_token=str(message.get("host_token") or ""))
        game_service.start_game(db, game_id, request.host_token)
        await _broadcast_state(game_id, db)
    except Exception as exc:
        detail = getattr(exc, "detail", None) or str(exc)
        await _send_error(websocket, detail)


async def _handle_claim_route(websocket: WebSocket, game_id: str, db: Session, message: dict) -> None:
    try:
        route_id_raw = message.get("route_id")
        request = ClaimRouteRequest(
            player_token=str(message.get("player_token") or ""),
            route_id=int(route_id_raw),
        )
        game_service.claim_route(db, game_id, request.player_token, request.route_id)
        await _broadcast_state(game_id, db)
    except Exception as exc:
        detail = getattr(exc, "detail", None) or str(exc)
        await _send_error(websocket, detail)


@router.websocket("/games/{game_id}")
async def game_ws(websocket: WebSocket, game_id: str, token: str = Query(default=""), db: Session = Depends(get_db)):
    player = db.scalar(select(Player).where(Player.game_id == game_id, Player.token == token))
    if not player:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await realtime_manager.connect(game_id, websocket, player_id=player.id, token=token)
    try:
        await websocket.send_json(
            {
                "type": "game_state",
                "payload": get_game_state(db, game_id).model_dump(mode="json"),
            }
        )
        await realtime_manager.broadcast_presence(game_id)

        while True:
            try:
                message = await websocket.receive_json()
                message_type = message.get("type")

                if message_type == "ping":
                    await websocket.send_json({"type": "pong", "payload": {"game_id": game_id}})
                elif message_type == "request_state":
                    await websocket.send_json({"type": "game_state", "payload": get_game_state(db, game_id).model_dump(mode="json")})
                elif message_type == "start_game":
                    await _handle_start_game(websocket, game_id, db, message)
                elif message_type == "claim_route":
                    await _handle_claim_route(websocket, game_id, db, message)
                else:
                    await websocket.send_json({"type": "error", "payload": {"detail": "Unknown message type"}})
            except ValueError as exc:
                await _send_error(websocket, str(exc))
            except TypeError as exc:
                await _send_error(websocket, str(exc))
    except WebSocketDisconnect:
        realtime_manager.disconnect(game_id, websocket)
        await realtime_manager.broadcast_presence(game_id)
    except Exception as exc:
        realtime_manager.disconnect(game_id, websocket)
        await realtime_manager.broadcast_presence(game_id)
        try:
            await _send_error(websocket, f"Server error: {exc}")
        except Exception:
            pass

