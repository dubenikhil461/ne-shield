"""Hazard early warning package."""
from app.services.hazard.hazard_service import OperationalHazardService, hazard_service
from app.services.hazard.susceptibility import (
    TERRAIN_CUTOFFS,
    compute_terrain_susceptibility,
    classify_static_susceptibility,
)
from app.services.hazard.warning import evaluate_warning, generate_warning_explanation
from app.services.hazard.weather import (
    caine_cumulative_depth_threshold,
    evaluate_trigger_state,
    fetch_weather_point,
    compute_api,
)

__all__ = [
    "OperationalHazardService",
    "hazard_service",
    "TERRAIN_CUTOFFS",
    "compute_terrain_susceptibility",
    "classify_static_susceptibility",
    "evaluate_warning",
    "generate_warning_explanation",
    "caine_cumulative_depth_threshold",
    "evaluate_trigger_state",
    "fetch_weather_point",
    "compute_api",
]
