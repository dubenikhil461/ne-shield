"""Alert management service."""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.risk_zone import RiskZone

logger = logging.getLogger(__name__)


def generate_alert_code() -> str:
    return f"ALT-{uuid.uuid4().hex[:8].upper()}"


def create_alert(
    db: Session,
    risk_zone_id: int,
    alert_level: str,
    title: str,
    message: str,
    reason: str = "",
) -> Alert:
    """Create a new alert."""
    zone = db.query(RiskZone).filter(RiskZone.id == risk_zone_id).first()
    zone_name = zone.name if zone else "Unknown Zone"

    alert = Alert(
        alert_code=generate_alert_code(),
        risk_zone_id=risk_zone_id,
        alert_level=alert_level,
        title=title,
        message=message,
        reason=reason,
        status="ACTIVE",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    logger.info(f"Alert created: {alert.alert_code} for {zone_name} [{alert_level}]")

    # Broadcast via WebSocket
    from app.core.websocket_manager import ws_manager
    import asyncio

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(
                ws_manager.broadcast("alerts", {
                    "event": "alert_created",
                    "data": {
                        "alert_code": alert.alert_code,
                        "title": alert.title,
                        "alert_level": alert.alert_level,
                        "zone_name": zone_name,
                        "status": alert.status,
                    },
                })
            )
    except Exception:
        pass  # WebSocket broadcast is best-effort

    return alert


def acknowledge_alert(db: Session, alert_id: int) -> Optional[Alert]:
    """Acknowledge an active alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None
    if alert.status != "ACTIVE":
        raise ValueError(f"Alert is {alert.status}, can only acknowledge ACTIVE alerts")

    alert.status = "ACKNOWLEDGED"
    db.commit()
    db.refresh(alert)
    logger.info(f"Alert acknowledged: {alert.alert_code}")
    return alert


def resolve_alert(db: Session, alert_id: int) -> Optional[Alert]:
    """Resolve an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None
    if alert.status == "RESOLVED":
        raise ValueError("Alert is already resolved")

    alert.status = "RESOLVED"
    alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    logger.info(f"Alert resolved: {alert.alert_code}")
    return alert


def get_alerts(
    db: Session,
    status: Optional[str] = None,
    alert_level: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    """Get paginated alerts with zone info."""
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if alert_level:
        query = query.filter(Alert.alert_level == alert_level)

    total = query.count()
    alerts = (
        query.order_by(desc(Alert.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Enrich with zone info
    result = []
    for alert in alerts:
        zone = db.query(RiskZone).filter(RiskZone.id == alert.risk_zone_id).first()
        entry = {
            **{c.name: getattr(alert, c.name) for c in Alert.__table__.columns},
            "zone_name": zone.name if zone else None,
            "zone_code": zone.zone_code if zone else None,
        }
        result.append(entry)

    return result, total


def get_alert_by_id(db: Session, alert_id: int) -> Optional[dict]:
    """Get a single alert with zone info."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None
    zone = db.query(RiskZone).filter(RiskZone.id == alert.risk_zone_id).first()
    return {
        **{c.name: getattr(alert, c.name) for c in Alert.__table__.columns},
        "zone_name": zone.name if zone else None,
        "zone_code": zone.zone_code if zone else None,
    }


def count_alerts_by_status(db: Session) -> dict:
    """Count alerts by status."""
    return {
        "active": db.query(Alert).filter(Alert.status == "ACTIVE").count(),
        "acknowledged": db.query(Alert).filter(Alert.status == "ACKNOWLEDGED").count(),
        "resolved": db.query(Alert).filter(Alert.status == "RESOLVED").count(),
    }
