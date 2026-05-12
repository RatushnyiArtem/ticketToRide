from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class ConnectionContext:
    websocket: WebSocket
    player_id: str | None = None
    token: str | None = None


class RealtimeManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[ConnectionContext]] = defaultdict(list)

    async def connect(
        self,
        game_id: str,
        websocket: WebSocket,
        player_id: str | None = None,
        token: str | None = None,
    ) -> None:
        await websocket.accept()
        self._connections[game_id].append(
            ConnectionContext(
                websocket=websocket,
                player_id=player_id,
                token=token,
            )
        )
        logger.info(f"Player {player_id} connected to game {game_id}. Total connections: {self.connection_count(game_id)}")

    def disconnect(self, game_id: str, websocket: WebSocket) -> None:
        contexts = self._connections.get(game_id, [])
        disconnected = False
        self._connections[game_id] = [
            ctx for ctx in contexts
            if (ctx.websocket is not websocket) or (disconnected := True)
        ]

        if not self._connections[game_id]:
            self._connections.pop(game_id, None)

        logger.info(f"Player disconnected from game {game_id}. Remaining connections: {self.connection_count(game_id)}")

    def connection_count(self, game_id: str) -> int:
        return len(self._connections.get(game_id, []))

    async def send_json(self, game_id: str, payload: dict[str, Any]) -> None:
        for context in list(self._connections.get(game_id, [])):
            try:
                await context.websocket.send_json(payload)
            except Exception as exc:
                logger.warning(f"Error sending message to game {game_id}: {exc}")
                self.disconnect(game_id, context.websocket)

    async def broadcast_game_state(
        self,
        game_id: str,
        game_state: dict[str, Any],
    ) -> None:
        await self.send_json(
            game_id,
            {
                "type": "game_state",
                "payload": game_state,
            },
        )

    async def broadcast_presence(self, game_id: str) -> None:
        await self.send_json(
            game_id,
            {
                "type": "presence",
                "payload": {
                    "connected": self.connection_count(game_id),
                },
            },
        )


realtime_manager = RealtimeManager()