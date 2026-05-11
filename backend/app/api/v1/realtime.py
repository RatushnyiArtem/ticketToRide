from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Player
from app.services import game_service
from app.services.game_service import get_realtime_game_state
from app.services.realtime_manager import realtime_manager

router = APIRouter(prefix="/realtime", tags=["realtime"])


async def _send_error(websocket: WebSocket, detail: str) -> None:
    await websocket.send_json({"type": "error", "payload": {"detail": detail}})


async def _send_personal_state(websocket: WebSocket, game_id: str, db: Session, token: str) -> None:
    await websocket.send_json({
        "type": "game_state",
        "payload": get_realtime_game_state(db, game_id, viewer_token=token),
    })


async def _broadcast_personal_states(game_id: str, db: Session) -> None:
    # RealtimeManager stores one ConnectionContext per connected player.
    # We send the same public board state to everyone, but each player receives only their own hand.
    for context in list(realtime_manager._connections.get(game_id, [])):
        try:
            await context.websocket.send_json({
                "type": "game_state",
                "payload": get_realtime_game_state(db, game_id, viewer_token=context.token),
            })
        except Exception:
            realtime_manager.disconnect(game_id, context.websocket)


async def _handle_action(websocket: WebSocket, game_id: str, db: Session, token: str, message: dict) -> None:
    message_type = message.get("type")

    try:
        if message_type == "ping":
            await websocket.send_json({"type": "pong", "payload": {"game_id": game_id}})
            return

        if message_type == "request_state":
            await _send_personal_state(websocket, game_id, db, token)
            return

        if message_type == "start_game":
            host_token = str(message.get("host_token") or token or "")
            game_service.start_game(db, game_id, host_token)
            await _broadcast_personal_states(game_id, db)
            return

        if message_type == "claim_route":
            player_token = str(message.get("player_token") or token or "")
            route_id_raw = message.get("route_id")
            if route_id_raw is None:
                await _send_error(websocket, "route_id is required")
                return

            game_service.claim_route(
                db=db,
                game_id=game_id,
                player_token=player_token,
                route_id=int(route_id_raw),
                claim_color=message.get("claim_color"),
            )
            await _broadcast_personal_states(game_id, db)
            return

        if message_type == "draw_blind_card":
            player_token = str(message.get("player_token") or token or "")
            game_service.draw_blind_card(db, game_id, player_token)
            await _broadcast_personal_states(game_id, db)
            return

        if message_type == "draw_market_card":
            player_token = str(message.get("player_token") or token or "")
            market_index_raw = message.get("market_index")
            if market_index_raw is None:
                await _send_error(websocket, "market_index is required")
                return

            game_service.draw_market_card(db, game_id, player_token, int(market_index_raw))
            await _broadcast_personal_states(game_id, db)
            return

        if message_type == "end_turn":
            player_token = str(message.get("player_token") or token or "")
            game_service.end_turn(db, game_id, player_token)
            await _broadcast_personal_states(game_id, db)
            return

        await _send_error(websocket, f"Unknown message type: {message_type}")

    except Exception as exc:
        db.rollback()
        detail = getattr(exc, "detail", None) or str(exc)
        await _send_error(websocket, detail)




@router.get("/games/{game_id}/state")
def game_realtime_state(game_id: str, token: str = Query(default=""), db: Session = Depends(get_db)):
    player = db.scalar(select(Player).where(Player.game_id == game_id, Player.token == token))
    if not player:
        return {"detail": "Invalid player token"}
    return get_realtime_game_state(db, game_id, viewer_token=token)

@router.websocket("/games/{game_id}")
async def game_ws(
    websocket: WebSocket,
    game_id: str,
    token: str = Query(default=""),
    db: Session = Depends(get_db),
):
    player = db.scalar(select(Player).where(Player.game_id == game_id, Player.token == token))
    if not player:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await realtime_manager.connect(game_id, websocket, player_id=str(player.id), token=token)

    try:
        await _send_personal_state(websocket, game_id, db, token)
        await realtime_manager.broadcast_presence(game_id)

        while True:
            message = await websocket.receive_json()
            await _handle_action(websocket, game_id, db, token, message)

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
