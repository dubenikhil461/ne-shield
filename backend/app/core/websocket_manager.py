"""WebSocket connection manager.

Supports multiple event channels for future extensibility.
Current channels: moisture, risk, alerts, field_reports.
"""

import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections by channel."""

    def __init__(self):
        self._channels: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str = "default"):
        await websocket.accept()
        if channel not in self._channels:
            self._channels[channel] = set()
        self._channels[channel].add(websocket)
        logger.info(f"WebSocket connected to channel '{channel}'")

    def disconnect(self, websocket: WebSocket, channel: str = "default"):
        if channel in self._channels:
            self._channels[channel].discard(websocket)
            logger.info(f"WebSocket disconnected from channel '{channel}'")

    async def broadcast(self, channel: str, data: dict):
        """Send a message to all connections on a channel."""
        if channel not in self._channels:
            return
        message = json.dumps(data)
        disconnected = []
        for ws in self._channels[channel]:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self._channels[channel].discard(ws)

    def get_connection_count(self, channel: str = None) -> int:
        if channel:
            return len(self._channels.get(channel, set()))
        return sum(len(conns) for conns in self._channels.values())


# Global singleton
ws_manager = ConnectionManager()
