"""Schemas for alerts."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AlertResponse(BaseModel):
    id: int
    alert_code: str
    risk_zone_id: int
    alert_level: str
    title: str
    message: str
    reason: str
    status: str
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    zone_name: Optional[str] = None
    zone_code: Optional[str] = None

    model_config = {"from_attributes": True}


class AlertCreate(BaseModel):
    risk_zone_id: int
    alert_level: str = Field(default="HIGH")
    title: str = Field(..., max_length=200)
    message: str
    reason: str = ""


class AlertListResponse(BaseModel):
    data: list[AlertResponse]
    total: int
    active_count: int = 0
    acknowledged_count: int = 0
    resolved_count: int = 0
