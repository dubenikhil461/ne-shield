"""Schemas for sensor management."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SensorCreate(BaseModel):
    sensor_code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    sensor_type: str = Field(default="SOIL_MOISTURE", max_length=20)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    battery_level: Optional[float] = None


class SensorUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    sensor_type: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    status: Optional[str] = None
    battery_level: Optional[float] = None


class SensorResponse(BaseModel):
    id: int
    sensor_code: str
    name: str
    sensor_type: str
    latitude: float
    longitude: float
    status: str
    last_seen_at: Optional[datetime] = None
    battery_level: Optional[float] = None
    current_moisture: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SensorListResponse(BaseModel):
    data: list[SensorResponse]
    total: int
