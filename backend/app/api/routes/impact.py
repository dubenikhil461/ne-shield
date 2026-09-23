"""Impact analysis API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.impact import ZoneImpactResponse, RoadListResponse, VillageListResponse
from app.services import impact_service

router = APIRouter()


@router.get("/zones/{zone_id}", response_model=ZoneImpactResponse)
def get_zone_impact(zone_id: int, db: Session = Depends(get_db)):
    """Get roads and villages affected by a risk zone."""
    result = impact_service.get_zone_impact(db, zone_id)
    if not result:
        raise HTTPException(status_code=404, detail="Risk zone not found")
    return result


@router.get("/roads", response_model=RoadListResponse)
def list_roads(db: Session = Depends(get_db)):
    """Get all roads with status."""
    roads = impact_service.get_all_roads(db)
    return RoadListResponse(data=roads, total=len(roads))


@router.get("/villages", response_model=VillageListResponse)
def list_villages(db: Session = Depends(get_db)):
    """Get all villages."""
    villages = impact_service.get_all_villages(db)
    return VillageListResponse(data=villages, total=len(villages))
