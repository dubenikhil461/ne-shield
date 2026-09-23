"""Moisture trend and risk correlation service."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.sensor import Sensor
from app.models.sensor_reading import SensorReading
from app.services import sensor_service

logger = logging.getLogger(__name__)


def get_current_moisture_for_zone(
    db: Session, zone_lat: float, zone_lon: float, radius_km: float = 5.0
) -> Optional[dict]:
    """Find the nearest sensor to a zone and return its moisture data."""
    # Find the nearest sensor using simple haversine approximation
    sensors = db.query(Sensor).filter(
        Sensor.sensor_type == "SOIL_MOISTURE",
        Sensor.status != "OFFLINE",
    ).all()

    if not sensors:
        return None

    best_sensor = None
    best_distance = float("inf")

    for s in sensors:
        # Approximate haversine distance in km
        dlat = (s.latitude - zone_lat) * 111.0
        dlon = (s.longitude - zone_lon) * 111.0 * 0.7  # rough latitude correction
        dist = (dlat ** 2 + dlon ** 2) ** 0.5
        if dist < best_distance:
            best_distance = dist
            best_sensor = s

    if best_sensor is None or best_distance > radius_km:
        return None

    latest = (
        db.query(SensorReading)
        .filter(SensorReading.sensor_id == best_sensor.id)
        .order_by(desc(SensorReading.timestamp))
        .first()
    )

    trend = sensor_service.get_moisture_trend(db, best_sensor.id, hours=3)

    return {
        "sensor_id": best_sensor.id,
        "sensor_code": best_sensor.sensor_code,
        "sensor_status": best_sensor.status,
        "current_moisture": latest.moisture_percent if latest else None,
        "latest_reading_at": latest.timestamp if latest else None,
        "moisture_trend": trend,
        "battery_level": latest.battery_level if latest else None,
    }


def classify_moisture_status(moisture: Optional[float], trend: Optional[float]) -> str:
    """Classify moisture status based on value and trend."""
    if moisture is None:
        return "NO_DATA"
    if moisture >= 75:
        return "HIGH"
    if moisture >= 65:
        return "ELEVATED"
    if trend is not None and trend > 10:
        return "RISING"
    return "NORMAL"
