"""GIS map (GeoJSON) API routes."""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.map import GeoJSONFeatureCollection
from app.services import map_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/study-area", response_model=GeoJSONFeatureCollection)
def study_area(db: Session = Depends(get_db)):
    """GeoJSON of all risk zones (polygons/points)."""
    return map_service.get_study_area_geojson(db)


@router.get("/roads", response_model=GeoJSONFeatureCollection)
def roads(db: Session = Depends(get_db)):
    """GeoJSON of road network."""
    return map_service.get_roads_geojson(db)


@router.get("/villages", response_model=GeoJSONFeatureCollection)
def villages(db: Session = Depends(get_db)):
    """GeoJSON of village locations."""
    return map_service.get_villages_geojson(db)


@router.get("/sensors", response_model=GeoJSONFeatureCollection)
def sensors(db: Session = Depends(get_db)):
    """GeoJSON of sensor locations."""
    return map_service.get_sensors_geojson(db)


@router.get("/field-reports", response_model=GeoJSONFeatureCollection)
def field_reports(db: Session = Depends(get_db)):
    """GeoJSON of field report locations."""
    return map_service.get_field_reports_geojson(db)
