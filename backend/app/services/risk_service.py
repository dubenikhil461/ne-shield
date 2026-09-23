"""Risk assessment service.

Combines AI/ML susceptibility output with live moisture data
to produce dynamic risk assessments.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.risk_zone import RiskZone
from app.models.sensor import Sensor
from app.services import moisture_service

logger = logging.getLogger(__name__)


def assess_zone_risk(
    db: Session, zone: RiskZone, moisture_data: Optional[dict] = None
) -> dict:
    """Compute risk assessment for a zone based on available inputs.

    Current inputs: susceptibility + moisture.
    Future: rainfall, deformation, field_evidence, tilt.
    """
    susceptibility = zone.susceptibility_score or 0.0
    moisture = moisture_data.get("current_moisture") if moisture_data else None
    trend = moisture_data.get("moisture_trend") if moisture_data else None

    # Risk scoring (prototype logic)
    risk_score = susceptibility * 0.5  # 50% weight from susceptibility

    if moisture is not None:
        moisture_factor = moisture / 100.0
        risk_score += moisture_factor * 0.3  # 30% from moisture

        if trend is not None and trend > 5:
            risk_score += 0.1  # 10% from rising trend
        if trend is not None and trend > 15:
            risk_score += 0.1  # additional for rapid rise

    # Clamp
    risk_score = min(max(risk_score, 0.0), 1.0)

    # Determine level
    if risk_score >= 0.75:
        risk_level = "CRITICAL"
    elif risk_score >= 0.55:
        risk_level = "HIGH"
    elif risk_score >= 0.35:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Build factors list
    factors = []
    if susceptibility >= 0.7:
        factors.append({
            "name": "susceptibility",
            "label": "High terrain susceptibility",
            "value": round(susceptibility, 2),
            "severity": "HIGH",
        })
    elif susceptibility >= 0.4:
        factors.append({
            "name": "susceptibility",
            "label": "Moderate terrain susceptibility",
            "value": round(susceptibility, 2),
            "severity": "MEDIUM",
        })

    if moisture is not None:
        m_severity = "HIGH" if moisture >= 75 else ("MEDIUM" if moisture >= 60 else "LOW")
        factors.append({
            "name": "soil_moisture",
            "label": f"{'High' if moisture >= 75 else 'Elevated' if moisture >= 60 else 'Normal'} soil moisture",
            "value": round(moisture, 1),
            "severity": m_severity,
        })

    if trend is not None and trend > 5:
        t_severity = "HIGH" if trend > 15 else "MEDIUM"
        factors.append({
            "name": "moisture_trend",
            "label": f"Moisture {'increasing rapidly' if trend > 15 else 'increasing'}",
            "value": round(trend, 1),
            "severity": t_severity,
        })

    return {
        "zone_id": zone.id,
        "zone_code": zone.zone_code,
        "zone_name": zone.name,
        "risk_level": risk_level,
        "risk_score": round(risk_score, 3),
        "susceptibility_score": round(susceptibility, 3),
        "current_moisture": moisture,
        "moisture_trend": round(trend, 1) if trend is not None else None,
        "moisture_status": moisture_service.classify_moisture_status(moisture, trend),
        "sensor_code": moisture_data.get("sensor_code") if moisture_data else None,
        "sensor_status": moisture_data.get("sensor_status") if moisture_data else None,
        "latest_reading_at": moisture_data.get("latest_reading_at") if moisture_data else None,
        "factors": factors,
        "updated_at": datetime.now(timezone.utc),
    }


def get_all_zone_assessments(db: Session) -> list[dict]:
    """Get risk assessments for all zones."""
    zones = db.query(RiskZone).all()
    results = []
    for zone in zones:
        moisture_data = moisture_service.get_current_moisture_for_zone(
            db, zone.latitude, zone.longitude
        )
        assessment = assess_zone_risk(db, zone, moisture_data)
        results.append(assessment)
    return results


def get_zone_assessment(db: Session, zone_id: int) -> Optional[dict]:
    """Get risk assessment for a single zone."""
    zone = db.query(RiskZone).filter(RiskZone.id == zone_id).first()
    if not zone:
        return None
    moisture_data = moisture_service.get_current_moisture_for_zone(
        db, zone.latitude, zone.longitude
    )
    return assess_zone_risk(db, zone, moisture_data)
