"""Sensor management service.

Handles sensor CRUD, status computation, and moisture reading history.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.sensor import Sensor, SensorStatus
from app.models.sensor_reading import SensorReading

logger = logging.getLogger(__name__)


def compute_sensor_status(sensor: Sensor, now: Optional[datetime] = None) -> str:
    """Compute sensor status based on last_seen_at and thresholds."""
    if sensor.last_seen_at is None:
        return SensorStatus.OFFLINE.value

    now = now or datetime.now(timezone.utc)
    elapsed = (now - sensor.last_seen_at).total_seconds()

    if elapsed <= settings.MOISTURE_OFFLINE_THRESHOLD_SECONDS:
        return SensorStatus.ONLINE.value
    elif elapsed <= settings.MOISTURE_OFFLINE_THRESHOLD_SECONDS * 3:
        return SensorStatus.WARNING.value
    else:
        return SensorStatus.OFFLINE.value


def get_all_sensors(
    db: Session,
    sensor_type: Optional[str] = None,
    status: Optional[str] = None,
) -> list[dict]:
    """Get all sensors with current status and latest moisture."""
    query = db.query(Sensor)
    if sensor_type:
        query = query.filter(Sensor.sensor_type == sensor_type)
    if status:
        query = query.filter(Sensor.status == status)

    sensors = query.order_by(Sensor.sensor_code).all()

    now = datetime.now(timezone.utc)
    result = []
    for sensor in sensors:
        # Recompute status
        new_status = compute_sensor_status(sensor, now)
        if new_status != sensor.status:
            sensor.status = new_status
            db.commit()

        # Get latest reading
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.sensor_id == sensor.id)
            .order_by(desc(SensorReading.timestamp))
            .first()
        )

        result.append({
            **{c.name: getattr(sensor, c.name) for c in Sensor.__table__.columns},
            "current_moisture": latest.moisture_percent if latest else None,
        })

    return result


def get_sensor_by_id(db: Session, sensor_id: int) -> Optional[dict]:
    """Get a single sensor with latest reading."""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        return None

    sensor.status = compute_sensor_status(sensor)
    db.commit()

    latest = (
        db.query(SensorReading)
        .filter(SensorReading.sensor_id == sensor.id)
        .order_by(desc(SensorReading.timestamp))
        .first()
    )

    return {
        **{c.name: getattr(sensor, c.name) for c in Sensor.__table__.columns},
        "current_moisture": latest.moisture_percent if latest else None,
    }


def get_sensor_by_code(db: Session, sensor_code: str) -> Optional[Sensor]:
    """Get a sensor by its code string."""
    return db.query(Sensor).filter(Sensor.sensor_code == sensor_code).first()


def create_sensor(db: Session, data: dict) -> Sensor:
    """Create a new sensor."""
    sensor = Sensor(
        sensor_code=data["sensor_code"],
        name=data["name"],
        sensor_type=data.get("sensor_type", "SOIL_MOISTURE"),
        latitude=data["latitude"],
        longitude=data["longitude"],
        battery_level=data.get("battery_level"),
        last_seen_at=datetime.now(timezone.utc),
    )
    db.add(sensor)
    db.commit()
    db.refresh(sensor)
    logger.info(f"Sensor created: {sensor.sensor_code}")
    return sensor


def update_sensor(db: Session, sensor_id: int, data: dict) -> Optional[Sensor]:
    """Update sensor properties."""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        return None
    for key, value in data.items():
        if value is not None and hasattr(sensor, key):
            setattr(sensor, key, value)
    db.commit()
    db.refresh(sensor)
    logger.info(f"Sensor updated: {sensor.sensor_code}")
    return sensor


def get_moisture_history(
    db: Session,
    sensor_id: int,
    hours: int = 24,
    page: int = 1,
    page_size: int = 100,
) -> Tuple[list[SensorReading], int]:
    """Get paginated moisture readings for a sensor."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    query = (
        db.query(SensorReading)
        .filter(SensorReading.sensor_id == sensor_id)
        .filter(SensorReading.timestamp >= since)
        .order_by(desc(SensorReading.timestamp))
    )

    total = query.count()
    readings = query.offset((page - 1) * page_size).limit(page_size).all()

    return readings, total


def get_latest_reading(db: Session, sensor_id: int) -> Optional[SensorReading]:
    """Get the most recent reading for a sensor."""
    return (
        db.query(SensorReading)
        .filter(SensorReading.sensor_id == sensor_id)
        .order_by(desc(SensorReading.timestamp))
        .first()
    )


def get_moisture_trend(
    db: Session, sensor_id: int, hours: int = 3
) -> Optional[float]:
    """Calculate moisture trend over the last N hours.

    Returns percentage change, or None if insufficient data.
    """
    now = datetime.now(timezone.utc)
    start = now - timedelta(hours=hours)

    readings = (
        db.query(SensorReading)
        .filter(SensorReading.sensor_id == sensor_id)
        .filter(SensorReading.timestamp >= start)
        .filter(SensorReading.moisture_percent.isnot(None))
        .order_by(SensorReading.timestamp)
        .all()
    )

    if len(readings) < 2:
        return None

    return readings[-1].moisture_percent - readings[0].moisture_percent


def create_reading(db: Session, data: dict) -> Tuple[SensorReading, Sensor]:
    """Create a new sensor reading and update sensor status."""
    sensor = get_sensor_by_code(db, data["sensor_code"])
    if not sensor:
        raise ValueError(f"Sensor not found: {data['sensor_code']}")

    reading = SensorReading(
        sensor_id=sensor.id,
        timestamp=data["timestamp"],
        moisture_percent=data.get("moisture_percent"),
        raw_value=data.get("raw_value"),
        battery_level=data.get("battery_level"),
        quality=data.get("quality", "GOOD"),
    )
    db.add(reading)

    # Update sensor
    sensor.last_seen_at = datetime.now(timezone.utc)
    sensor.status = compute_sensor_status(sensor)
    if data.get("battery_level") is not None:
        sensor.battery_level = data["battery_level"]

    db.commit()
    db.refresh(reading)

    logger.info(f"Reading stored: {sensor.sensor_code} -> {data.get('moisture_percent')}%")
    return reading, sensor
