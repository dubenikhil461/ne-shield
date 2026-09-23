"""Authoritative static susceptibility calculation.

Implements the scientifically frozen Terrain Heuristic:
- slope_deg
- elevation_m
- profile_curv
- plan_curv
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any
import numpy as np

log = logging.getLogger(__name__)

# Scientifically frozen coefficients (Logistic Regression with balanced weights)
TERRAIN_HEURISTIC_COEFFICIENTS: dict[str, float] = {
    "slope_deg": 0.02626589,
    "elevation_m": 0.00086692,
    "profile_curv": -0.71490931,
    "plan_curv": -0.55444297,
}
TERRAIN_HEURISTIC_INTERCEPT: float = -1.32980875

# Standardized susceptibility cutoffs from validation calibration:
# Yellow: 80% recall on historical training landslides (0.4295)
# Orange: 85th percentile of regional terrain scores (0.6202)
# Red: 95th percentile of regional terrain scores (0.7179)
TERRAIN_CUTOFFS: dict[str, float] = {
    "yellow": 0.4295,
    "orange": 0.6202,
    "red": 0.7179,
}


@dataclass(frozen=True)
class TerrainFeatures:
    """Terrain variables required by the Terrain Heuristic."""
    slope_deg: float
    elevation_m: float
    profile_curv: float
    plan_curv: float


def compute_terrain_susceptibility(
    slope_deg: float | np.ndarray,
    elevation_m: float | np.ndarray,
    profile_curv: float | np.ndarray,
    plan_curv: float | np.ndarray,
) -> float | np.ndarray:
    """Compute static landslide susceptibility using the frozen Terrain Heuristic.

    Formula:
        z = intercept + w_slope * slope + w_elev * elev + w_prof * prof + w_plan * plan
        susceptibility = 1 / (1 + exp(-z))
    """
    s = np.asarray(slope_deg, dtype=np.float64)
    e = np.asarray(elevation_m, dtype=np.float64)
    prof = np.asarray(profile_curv, dtype=np.float64)
    plan = np.asarray(plan_curv, dtype=np.float64)

    z = (
        TERRAIN_HEURISTIC_INTERCEPT
        + TERRAIN_HEURISTIC_COEFFICIENTS["slope_deg"] * s
        + TERRAIN_HEURISTIC_COEFFICIENTS["elevation_m"] * e
        + TERRAIN_HEURISTIC_COEFFICIENTS["profile_curv"] * prof
        + TERRAIN_HEURISTIC_COEFFICIENTS["plan_curv"] * plan
    )
    # Numerical stability clip for sigmoid
    z = np.clip(z, -30.0, 30.0)
    score = 1.0 / (1.0 + np.exp(-z))

    if np.ndim(slope_deg) == 0:
        return float(score)
    return score


def classify_static_susceptibility(score: float) -> str:
    """Classify static susceptibility score into hazard tier."""
    if score >= TERRAIN_CUTOFFS["red"]:
        return "critical"
    if score >= TERRAIN_CUTOFFS["orange"]:
        return "high"
    if score >= TERRAIN_CUTOFFS["yellow"]:
        return "moderate"
    return "low"
