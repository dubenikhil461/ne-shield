"""Domain schemas for the landslide hazard early warning system."""
from __future__ import annotations

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

WarningLevel = Literal["green", "yellow", "orange", "red"]
SusceptibilityTier = Literal["low", "moderate", "high", "critical"]
TriggerState = Literal["dry", "wet", "saturated"]


class HazardHealthResponse(BaseModel):
    """System health and operational hazard model provenance."""

    status: str = Field(default="healthy")
    service: str = Field(default="ne-shield-hazard")
    version: str = Field(default="1.0.0")
    architecture: str = Field(
        default="Terrain Heuristic + Dynamic Hydrometeorological Trigger"
    )
    static_model: str = Field(
        default="Terrain Heuristic (slope_deg, elevation_m, profile_curv, plan_curv)"
    )
    dynamic_trigger: str = Field(
        default="24h Cumulative Rainfall (Caine 102.99mm) + API15 (decay 0.85)"
    )
    settlements_count: int = Field(default=1386)
    districts_count: int = Field(default=9)
    current_date: str
    iot_connected: bool = Field(default=False)
    iot_target_settlement: Optional[str] = None


class DistrictInfo(BaseModel):
    """District summary metadata."""

    district: str
    state: str
    terrain_type: str
    settlement_count: int
    mean_slope_deg: float
    mean_elevation_m: float
    critical_susceptibility_count: int
    high_susceptibility_count: int
    moderate_susceptibility_count: int
    low_susceptibility_count: int


class HazardZoneProperties(BaseModel):
    """Properties for a spatial settlement in Hazard GeoJSON."""

    settlement_id: str
    name: str
    district: str
    source: str
    lon: float
    lat: float
    slope_deg: float
    elevation_m: float
    profile_curv: float
    plan_curv: float
    static_susceptibility: float
    susceptibility_tier: SusceptibilityTier
    rain_24h_mm: float
    api15_mm: Optional[float] = None
    trigger_state: TriggerState
    caine_exceedance: bool
    caine_threshold_24h_mm: float
    warning_level: WarningLevel
    explanation: str
    target_date: str
    fetched_at: Optional[str] = None
    iot_moisture: Optional[float] = None
    is_iot_monitored: bool = False


class HazardGeometry(BaseModel):
    """GeoJSON Point geometry."""

    type: Literal["Point"] = "Point"
    coordinates: list[float]  # [lon, lat]


class HazardFeature(BaseModel):
    """GeoJSON Feature."""

    type: Literal["Feature"] = "Feature"
    id: str
    geometry: HazardGeometry
    properties: HazardZoneProperties


class HazardFeatureCollection(BaseModel):
    """GeoJSON FeatureCollection."""

    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[HazardFeature]
    metadata: dict[str, Any] = Field(default_factory=dict)


class HazardRefreshRequest(BaseModel):
    """Request to update weather and recompute operational warnings."""

    target_date: Optional[str] = None
    use_mock_weather: bool = False


class IoTSettlementMoistureRequest(BaseModel):
    """Payload from dedicated IoT hardware chip modifying single settlement susceptibility and moisture."""

    settlement_id: str = Field(
        default="LGD_0000",
        description="Target settlement ID (e.g., LGD_0000 or specific village ID)",
    )
    moisture_percent: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Moisture percentage measured by physical IoT probe (0-100%)",
    )
    device_id: Optional[str] = Field(
        default="IOT-CHIP-01",
        description="Identifier of the physical IoT chip",
    )
    susceptibility_offset: Optional[float] = Field(
        default=None,
        description="Optional direct offset or override for susceptibility score",
    )
