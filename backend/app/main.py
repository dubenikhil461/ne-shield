"""NE-SHIELD Landslide Early Warning System - FastAPI Application."""
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.websocket_manager import ws_manager
from app.api.router import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="NE-SHIELD Landslide Early Warning System",
    version="1.0.0",
    description="District-level landslide early-warning and decision-support platform",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(api_router)


# WebSocket endpoints
@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    """Generic WebSocket endpoint supporting multiple channels."""
    await ws_manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel)


@app.websocket("/ws/moisture")
async def moisture_websocket(websocket: WebSocket):
    """Dedicated moisture WebSocket endpoint."""
    await ws_manager.connect(websocket, "moisture")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "moisture")
