"""Sensor management and moisture ingestion API routes."""
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.websocket_manager import ws_manager
from app.core.config import settings
from app.schemas.sensor import SensorCreate, SensorUpdate, SensorResponse, SensorListResponse
from app.schemas.sensor_reading import (
    SensorReadingCreate,
    SensorReadingResponse,
    SensorReadingListResponse,
    MoistureUpdate,
)
from app.services import sensor_service
from app.utils.validators import validate_moisture, validate_coordinates

logger = logging.getLogger(__name__)

router = APIRouter()


# ---- Sensor CRUD ----

@router.get("", response_model=SensorListResponse)
def list_sensors(
    sensor_type: Optional[str] = Query(None),
    sensor_status: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    """List all sensors with current status."""
    sensors = sensor_service.get_all_sensors(db, sensor_type=sensor_type, status=sensor_status)
    return SensorListResponse(data=sensors, total=len(sensors))


@router.post("", response_model=SensorResponse, status_code=status.HTTP_201_CREATED)
def create_sensor(body: SensorCreate, db: Session = Depends(get_db)):
    """Register a new sensor."""
    existing = sensor_service.get_sensor_by_code(db, body.sensor_code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sensor with code '{body.sensor_code}' already exists.",
        )
    validate_coordinates(body.latitude, body.longitude)
    sensor = sensor_service.create_sensor(db, body.model_dump())
    data = {c.name: getattr(sensor, c.name) for c in sensor.__table__.columns}
    data["current_moisture"] = None
    return data


@router.get("/{sensor_id}", response_model=SensorResponse)
def get_sensor(sensor_id: int, db: Session = Depends(get_db)):
    """Get a single sensor with latest reading."""
    data = sensor_service.get_sensor_by_id(db, sensor_id)
    if not data:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return data


@router.patch("/{sensor_id}", response_model=SensorResponse)
def update_sensor(sensor_id: int, body: SensorUpdate, db: Session = Depends(get_db)):
    """Update sensor properties."""
    data = body.model_dump(exclude_unset=True)
    if "latitude" in data and "longitude" in data:
        validate_coordinates(data["latitude"], data["longitude"])
    sensor = sensor_service.update_sensor(db, sensor_id, data)
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    result = {c.name: getattr(sensor, c.name) for c in sensor.__table__.columns}
    latest = sensor_service.get_latest_reading(db, sensor.id)
    result["current_moisture"] = latest.moisture_percent if latest else None
    return result


# ---- Moisture Ingestion ----

@router.post("/readings", response_model=SensorReadingResponse, status_code=status.HTTP_201_CREATED)
async def ingest_moisture_reading(body: SensorReadingCreate, db: Session = Depends(get_db)):
    """Ingest a soil-moisture reading from IoT sensor.

    Validates, stores, updates sensor status, and broadcasts via WebSocket.
    """
    validate_moisture(body.moisture_percent)

    try:
        reading, sensor = sensor_service.create_reading(db, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    # Determine moisture status
    moisture_status = "NORMAL"
    if body.moisture_percent >= settings.MOISTURE_HIGH_THRESHOLD:
        moisture_status = "HIGH"
    elif body.moisture_percent >= settings.MOISTURE_WARNING_THRESHOLD:
        moisture_status = "WARNING"

    # Broadcast via WebSocket
    ws_data = {
        "event": "moisture_update",
        "data": {
            "sensor_id": sensor.id,
            "sensor_code": sensor.sensor_code,
            "timestamp": body.timestamp.isoformat(),
            "moisture_percent": body.moisture_percent,
            "battery_level": body.battery_level,
            "status": sensor.status,
            "moisture_status": moisture_status,
        },
    }
    await ws_manager.broadcast("moisture", ws_data)
    logger.info(f"Moisture broadcast: {sensor.sensor_code} -> {body.moisture_percent}% ({moisture_status})")

    return reading


# ---- Moisture History ----

@router.get("/{sensor_id}/readings", response_model=SensorReadingListResponse)
def get_sensor_readings(
    sensor_id: int,
    hours: int = Query(24, ge=1, le=720),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Get paginated moisture readings for a sensor."""
    sensor = sensor_service.get_sensor_by_id(db, sensor_id)
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    readings, total = sensor_service.get_moisture_history(
        db, sensor_id, hours=hours, page=page, page_size=page_size
    )

    return SensorReadingListResponse(
        data=readings,
        sensor_code=sensor["sensor_code"],
        total=total,
        page=page,
        page_size=page_size,
    )
