"""Hazard early warning and terrain susceptibility API routes."""
from __future__ import annotations

import logging
from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.websocket_manager import ws_manager
from app.schemas.hazard import (
    DistrictInfo,
    HazardFeature,
    HazardFeatureCollection,
    HazardHealthResponse,
    HazardRefreshRequest,
    IoTSettlementMoistureRequest,
)
from app.services.hazard import hazard_service
from app.services.hazard.settlements import get_district_summary

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HazardHealthResponse)
def hazard_health() -> HazardHealthResponse:
    """Check hazard service health and operational model specifications."""
    today_str = date.today().isoformat()
    iot_monitored = list(hazard_service._iot_readings.keys())
    return HazardHealthResponse(
        status="healthy",
        service="ne-shield-hazard",
        version="1.0.0",
        architecture="Terrain Heuristic + Dynamic Hydrometeorological Trigger",
        static_model="Terrain Heuristic (slope_deg, elevation_m, profile_curv, plan_curv)",
        dynamic_trigger="24h Cumulative Rainfall (Caine 102.99mm) + API15 (decay 0.85)",
        settlements_count=len(hazard_service._settlements_df) if hazard_service._settlements_df is not None else 1386,
        districts_count=9,
        current_date=today_str,
        iot_connected=len(iot_monitored) > 0,
        iot_target_settlement=iot_monitored[0] if iot_monitored else None,
    )


@router.get("/districts", response_model=list[DistrictInfo])
def get_districts() -> list[DistrictInfo]:
    """Retrieve summary metadata and settlement counts for all 9 pilot districts."""
    summaries = get_district_summary(base_dir=hazard_service.base_dir)
    return [DistrictInfo(**s) for s in summaries]


@router.get("/zones", response_model=HazardFeatureCollection)
def get_hazard_zones(
    date_str: Optional[str] = Query(
        default=None,
        alias="date",
        description="Target date YYYY-MM-DD. Defaults to current date.",
    ),
    refresh: bool = Query(
        default=False,
        description="Force recalculation from meteorological feeds.",
    ),
    mock: bool = Query(
        default=False,
        description="Use offline simulated weather for demonstration.",
    ),
) -> HazardFeatureCollection:
    """Retrieve GeoJSON FeatureCollection of all 1,386 settlements with authoritative warning states.

    Public endpoint consumed by the interactive map.
    """
    target_d = date_str or date.today().isoformat()

    mock_weather = None
    if mock:
        mock_weather = {
            "25.7,94.1": {"rain24": 110.0, "api15": 210.0, "flags": []},  # Kohima severe
            "25.7,94.5": {"rain24": 65.0, "api15": 175.0, "flags": []},   # Phek moderate/high
            "25.5,93.7": {"rain24": 40.0, "api15": 140.0, "flags": []},   # Peren wet
            "26.1,94.3": {"rain24": 25.0, "api15": 110.0, "flags": []},   # Wokha watch
        }

    return hazard_service.compute_zones(
        target_date=target_d,
        force_refresh=refresh,
        mock_weather=mock_weather,
    )


@router.get("/zones/{settlement_id}", response_model=HazardFeature)
def get_hazard_zone_by_id(
    settlement_id: str,
    date_str: Optional[str] = Query(default=None, alias="date"),
    refresh: bool = Query(default=False, description="Force live weather refetch."),
    mock: bool = Query(default=False, description="Use simulated weather."),
) -> HazardFeature:
    """Retrieve detailed properties, terrain metrics, and explanation for a single settlement."""
    target_d = date_str or date.today().isoformat()
    if refresh:
        feature = hazard_service.refresh_settlement_weather(
            settlement_id=settlement_id,
            target_date=target_d,
            mock=mock,
        )
    else:
        mock_weather = None
        if mock:
            mock_weather = {
                "25.7,94.1": {"rain24": 110.0, "api15": 210.0, "flags": []},
                "25.7,94.5": {"rain24": 65.0, "api15": 175.0, "flags": []},
            }
        feature = hazard_service.get_zone_by_id(
            settlement_id=settlement_id,
            target_date=target_d,
            mock_weather=mock_weather,
        )

    if feature is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Settlement '{settlement_id}' not found in master registry.",
        )
    return feature


@router.post("/zones/{settlement_id}/refresh", response_model=HazardFeature)
def refresh_single_hazard_zone(
    settlement_id: str,
    date_str: Optional[str] = Query(default=None, alias="date"),
    mock: bool = Query(default=False, description="Use simulated weather."),
) -> HazardFeature:
    """Live refetch weather for a single settlement and recompute hazard state."""
    target_d = date_str or date.today().isoformat()
    feature = hazard_service.refresh_settlement_weather(
        settlement_id=settlement_id,
        target_date=target_d,
        mock=mock,
    )
    if feature is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Settlement '{settlement_id}' not found in master registry.",
        )
    return feature


@router.post("/iot/reading", response_model=HazardFeature)
async def ingest_iot_reading(body: IoTSettlementMoistureRequest) -> HazardFeature:
    """Dedicated endpoint for physical IoT sensor chip monitoring a specific settlement.

    Updates the settlement's soil moisture, dynamically adjusts its terrain
    susceptibility score, recomputes the warning level (color), and broadcasts
    an instantaneous live update to all WebSocket listeners.
    """
    feature = hazard_service.apply_iot_reading(
        settlement_id=body.settlement_id,
        moisture_percent=body.moisture_percent,
        susceptibility_offset=body.susceptibility_offset,
    )
    if feature is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Settlement '{body.settlement_id}' not found.",
        )

    # Broadcast real-time hazard update to WebSocket
    ws_payload = {
        "event": "hazard_iot_update",
        "data": {
            "settlement_id": feature.properties.settlement_id,
            "name": feature.properties.name,
            "district": feature.properties.district,
            "warning_level": feature.properties.warning_level,
            "static_susceptibility": feature.properties.static_susceptibility,
            "susceptibility_tier": feature.properties.susceptibility_tier,
            "moisture_percent": body.moisture_percent,
            "device_id": body.device_id,
            "explanation": feature.properties.explanation,
        },
    }
    await ws_manager.broadcast("moisture", ws_payload)
    logger.info(
        "IoT update applied for %s: %s%% moisture -> %s (score: %.3f)",
        body.settlement_id,
        body.moisture_percent,
        feature.properties.warning_level,
        feature.properties.static_susceptibility,
    )
    return feature


@router.get("/bulletin")
def get_hazard_bulletin(
    date_str: Optional[str] = Query(default=None, alias="date"),
    mock: bool = Query(default=False, description="Use simulated weather."),
) -> dict[str, Any]:
    """Retrieve daily hazard bulletin summary statistics and active warning counts."""
    target_d = date_str or date.today().isoformat()
    mock_weather = None
    if mock:
        mock_weather = {
            "25.7,94.1": {"rain24": 110.0, "api15": 210.0, "flags": []},
        }
    collection = hazard_service.compute_zones(target_date=target_d, mock_weather=mock_weather)
    summary = collection.metadata.get("summary", {})
    return {
        "target_date": target_d,
        "total_settlements": len(collection.features),
        "warning_breakdown": summary,
        "active_warnings": (
            summary.get("yellow", 0)
            + summary.get("orange", 0)
            + summary.get("red", 0)
        ),
        "iot_monitored_settlements": list(hazard_service._iot_readings.keys()),
        "generated_at": collection.metadata.get("generated_at"),
    }


@router.post("/refresh", response_model=HazardFeatureCollection)
def refresh_hazard_predictions(req: HazardRefreshRequest) -> HazardFeatureCollection:
    """Manually refresh weather feeds and recompute hazard states."""
    target_d = req.target_date or date.today().isoformat()
    mock_weather = None
    if req.use_mock_weather:
        mock_weather = {
            "25.7,94.1": {"rain24": 115.0, "api15": 215.0, "flags": []},
        }
    return hazard_service.compute_zones(
        target_date=target_d,
        force_refresh=True,
        mock_weather=mock_weather,
    )
