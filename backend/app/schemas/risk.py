"""Schemas for risk assessment and correlation."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class RiskFactor(BaseModel):
    name: str
    label: str
    value: float
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL


class RiskAssessment(BaseModel):
    zone_id: int
    zone_code: str
    zone_name: str
    risk_level: str
    risk_score: float
    susceptibility_score: float
    current_moisture: Optional[float] = None
    moisture_trend: Optional[float] = None
    moisture_status: Optional[str] = None
    sensor_code: Optional[str] = None
    sensor_status: Optional[str] = None
    latest_reading_at: Optional[datetime] = None
    factors: list[RiskFactor] = []
    updated_at: datetime

    model_config = {"from_attributes": True}


class RiskAssessmentListResponse(BaseModel):
    data: list[RiskAssessment]
    total_high: int = 0
    total_critical: int = 0
    total_medium: int = 0
    total_low: int = 0


class ZoneHistoryEntry(BaseModel):
    risk_level: str
    risk_score: float
    moisture: Optional[float] = None
    recorded_at: datetime
