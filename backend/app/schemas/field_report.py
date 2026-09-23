"""Schemas for field reports."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class FieldReportCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    severity: str = Field(default="MEDIUM")
    photo_url: Optional[str] = None


class FieldReportUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None


class FieldReportResponse(BaseModel):
    id: int
    report_code: str
    reported_by: int
    description: str
    latitude: float
    longitude: float
    photo_url: Optional[str] = None
    severity: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FieldReportListResponse(BaseModel):
    data: list[FieldReportResponse]
    total: int
    page: int
    page_size: int
