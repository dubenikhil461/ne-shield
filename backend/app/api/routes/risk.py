"""Risk assessment API routes."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.risk import (
    RiskAssessment,
    RiskAssessmentListResponse,
    ZoneHistoryEntry,
)
from app.services import risk_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/current", response_model=RiskAssessmentListResponse)
def current_risk(db: Session = Depends(get_db)):
    """Get live risk assessments for all zones."""
    assessments = risk_service.get_all_zone_assessments(db)
    total = len(assessments)
    def count(level: str) -> int:
        return sum(1 for a in assessments if a.get("risk_level") == level)
    return {
        "data": assessments,
        "total_high": count("HIGH"),
        "total_critical": count("CRITICAL"),
        "total_medium": count("MEDIUM"),
        "total_low": count("LOW"),
    }


@router.get("/zones", response_model=RiskAssessmentListResponse)
def all_zones(db: Session = Depends(get_db)):
    """Alias of /current returning all zone assessments."""
    return current_risk(db)


@router.get("/zones/{zone_id}", response_model=RiskAssessment)
def zone_risk(zone_id: int, db: Session = Depends(get_db)):
    """Get risk assessment for a single zone."""
    assessment = risk_service.get_zone_assessment(db, zone_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Zone not found")
    return assessment


@router.get("/zones/{zone_id}/history", response_model=list[ZoneHistoryEntry])
def zone_history(zone_id: int, db: Session = Depends(get_db)):
    """Get risk history for a single zone.

    NOTE: The current release persists only the latest assessment. This returns
    a single snapshot entry; a time-series history table can be added later.
    """
    assessment = risk_service.get_zone_assessment(db, zone_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Zone not found")
    return [
        ZoneHistoryEntry(
            risk_level=assessment["risk_level"],
            risk_score=assessment["risk_score"],
            moisture=assessment.get("current_moisture"),
            recorded_at=assessment.get("updated_at") or datetime.now(timezone.utc),
        )
    ]
