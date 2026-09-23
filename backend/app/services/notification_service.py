"""Notification service interface.

Currently logs and broadcasts via WebSocket.
Future: SMS, email, push notifications.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def send_alert_notification(alert: dict) -> None:
    """Send alert notification through available channels.

    For now: log + WebSocket broadcast.
    Future: attach external notification providers here.
    """
    logger.info(
        f"[NOTIFICATION] Alert {alert.get('alert_code', 'N/A')} "
        f"[{alert.get('alert_level', 'N/A')}] "
        f"Title: {alert.get('title', 'N/A')}"
    )

    try:
        from app.core.websocket_manager import ws_manager
        await ws_manager.broadcast("alerts", {
            "event": "alert_notification",
            "data": alert,
        })
    except Exception as e:
        logger.warning(f"Failed to broadcast notification: {e}")


async def send_risk_update_notification(zone_data: dict) -> None:
    """Notify about risk level changes."""
    logger.info(
        f"[NOTIFICATION] Risk update for zone {zone_data.get('zone_code', 'N/A')} "
        f"-> {zone_data.get('risk_level', 'N/A')}"
    )
