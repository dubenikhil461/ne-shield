"""Schemas for sensor readings."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SensorReadingCreate(BaseModel):
    sensor_code: str = Field(..., max_length=50)
    timestamp: datetime
    moisture_percent: float = Field(..., ge=0, le=100)
    raw_value: Optional[float] = None
    battery_level: Optional[float] = Field(None, ge=0, le=100)
    quality: str = Field(default="GOOD", max_length=20)


class SensorReadingResponse(BaseModel):
    id: int
    sensor_id: int
    timestamp: datetime
    moisture_percent: Optional[float] = None
    raw_value: Optional[float] = None
    battery_level: Optional[float] = None
    quality: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SensorReadingListResponse(BaseModel):
    data: list[SensorReadingResponse]
    sensor_code: str
    total: int
    page: int
    page_size: int


class MoistureUpdate(BaseModel):
    """WebSocket moisture update payload."""
    sensor_id: int
    sensor_code: str
    timestamp: str
    moisture_percent: float
    battery_level: Optional[float] = None
    status: str
