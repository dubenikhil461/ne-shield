"""System health and status API routes."""
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.websocket_manager import ws_manager
from app.models.sensor import Sensor
from app.models.alert import Alert

router = APIRouter()


@router.get("")
def health_check(db: Session = Depends(get_db)):
    """System health check endpoint."""
    status_info = {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {},
    }

    # Database check
    try:
        start = time.time()
        db.execute(text("SELECT 1"))
        db_time = round((time.time() - start) * 1000, 1)
        status_info["services"]["database"] = {
            "status": "ok",
            "response_ms": db_time,
        }
    except Exception as e:
        status_info["services"]["database"] = {
            "status": "error",
            "error": str(e),
        }
        status_info["status"] = "degraded"

    # Sensor count
    try:
        total_sensors = db.query(Sensor).count()
        active_sensors = db.query(Sensor).filter(Sensor.status == "ONLINE").count()
        status_info["services"]["sensors"] = {
            "total": total_sensors,
            "active": active_sensors,
        }
    except Exception:
        pass

    # Alert count
    try:
        active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()
        status_info["services"]["alerts"] = {
            "active": active_alerts,
        }
    except Exception:
        pass

    # WebSocket
    status_info["services"]["websocket"] = {
        "enabled": settings.WEBSOCKET_ENABLED,
        "connections": ws_manager.get_connection_count(),
    }

    # AI/ML mode
    status_info["services"]["ai_ml"] = {
        "mode": settings.AI_ML_MODE,
    }

    return status_info


@router.get("/status")
def system_status(db: Session = Depends(get_db)):
    """Extended system status for the monitoring page."""
    total_sensors = db.query(Sensor).count()
    active_sensors = db.query(Sensor).filter(Sensor.status == "ONLINE").count()
    warning_sensors = db.query(Sensor).filter(Sensor.status == "WARNING").count()
    offline_sensors = db.query(Sensor).filter(Sensor.status == "OFFLINE").count()
    active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()

    return {
        "data": {
            "api_status": "operational",
            "database_status": "connected",
            "ai_ml_mode": settings.AI_ML_MODE,
            "websocket_enabled": settings.WEBSOCKET_ENABLED,
            "websocket_connections": ws_manager.get_connection_count(),
            "sensors": {
                "total": total_sensors,
                "online": active_sensors,
                "warning": warning_sensors,
                "offline": offline_sensors,
            },
            "active_alerts": active_alerts,
            "moisture_thresholds": {
                "offline_seconds": settings.MOISTURE_OFFLINE_THRESHOLD_SECONDS,
                "warning": settings.MOISTURE_WARNING_THRESHOLD,
                "high": settings.MOISTURE_HIGH_THRESHOLD,
            },
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
