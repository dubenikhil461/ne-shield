"""Schemas for road/village impact analysis."""
from typing import Optional
from pydantic import BaseModel


class AffectedRoad(BaseModel):
    id: int
    road_name: str
    road_type: str
    status: str
    distance_km: Optional[float] = None

    model_config = {"from_attributes": True}


class AffectedVillage(BaseModel):
    id: int
    name: str
    population: int
    latitude: float
    longitude: float
    distance_km: Optional[float] = None

    model_config = {"from_attributes": True}


class ZoneImpactResponse(BaseModel):
    zone_id: int
    zone_code: str
    zone_name: str
    risk_level: str
    affected_roads: list[AffectedRoad]
    potentially_affected_villages: list[AffectedVillage]
    alternative_routes_available: bool
    total_road_length_at_risk_km: float = 0.0
    total_population_at_risk: int = 0


class RoadListResponse(BaseModel):
    data: list[dict]
    total: int


class VillageListResponse(BaseModel):
    data: list[dict]
    total: int
