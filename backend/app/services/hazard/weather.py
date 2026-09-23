"""Meteorological and hydrometeorological trigger calculations.

Implements the Caine (1980) rainfall threshold, API15 antecedent precipitation
index, and village-scale Open-Meteo weather querying.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

import httpx
import numpy as np

log = logging.getLogger(__name__)

# Caine (1980) global threshold: I = alpha * D^(-beta)
# I = mean rainfall intensity in mm/hour
# D = duration in hours
CAINE_ALPHA: float = 14.82
CAINE_BETA: float = 0.39


def caine_intensity_threshold(duration_h: float) -> float:
    """Calculate Caine (1980) rainfall intensity threshold in mm/hour."""
    if duration_h <= 0:
        raise ValueError("Duration must be positive")
    return float(CAINE_ALPHA * (duration_h ** -CAINE_BETA))


def caine_cumulative_depth_threshold(duration_h: float) -> float:
    """Calculate Caine (1980) cumulative rainfall depth threshold in mm.

    For 24 h: 14.82 * 24^(0.61) = 102.99 mm.
    """
    if duration_h <= 0:
        raise ValueError("Duration must be positive")
    return float(CAINE_ALPHA * (duration_h ** (1.0 - CAINE_BETA)))


def check_caine_exceedance(rain_sum_mm: float, duration_h: float = 24.0) -> bool:
    """Check if cumulative rainfall depth exceeds the Caine (1980) threshold."""
    threshold_mm = caine_cumulative_depth_threshold(duration_h)
    return bool(rain_sum_mm >= threshold_mm)


def compute_api(
    rainfall_series: np.ndarray,
    decay: float = 0.85,
    window_days: int = 15,
) -> np.ndarray:
    """Compute Antecedent Precipitation Index (API) over a trailing window."""
    n = window_days
    weights = decay ** np.arange(n)[::-1]

    out = np.zeros(len(rainfall_series), dtype=np.float64)
    for i in range(len(rainfall_series)):
        m = min(n, i)
        if m == 0:
            out[i] = 0.0
        else:
            slice_rain = rainfall_series[i - m : i]
            slice_weights = weights[-m:]
            out[i] = float(np.sum(slice_rain * slice_weights))
    return out


def cluster_village_coordinates(
    lons: np.ndarray,
    lats: np.ndarray,
    grid_res: float = 0.1,
) -> dict[tuple[float, float], list[int]]:
    """Cluster coordinates to local meteorological grid cells (~0.1 deg / 10 km)."""
    clusters: dict[tuple[float, float], list[int]] = {}
    for idx, (lon, lat) in enumerate(zip(lons, lats)):
        r_lat = round(round(float(lat) / grid_res) * grid_res, 3)
        r_lon = round(round(float(lon) / grid_res) * grid_res, 3)
        clusters.setdefault((r_lat, r_lon), []).append(idx)
    return clusters


def fetch_weather_point(
    lat: float,
    lon: float,
    target_date: str,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """Fetch 24h precipitation and 15-day trailing API from Open-Meteo for a specific point."""
    target_d = date.fromisoformat(target_date)
    today = date.today()
    flags: list[str] = []
    rain24: float = 0.0
    api15: float = float("nan")

    own_client = False
    if client is None:
        client = httpx.Client(timeout=30.0)
        own_client = True

    try:
        data_fetched = False
        k, n = 0.85, 15
        w = k ** np.arange(n)[::-1]

        # Historical dates (<= today - 5 days) use archive API
        if target_d <= today - timedelta(days=5):
            start_d = (target_d - timedelta(days=16)).isoformat()
            try:
                a = client.get(
                    "https://archive-api.open-meteo.com/v1/archive",
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "start_date": start_d,
                        "end_date": target_date,
                        "daily": "precipitation_sum",
                        "timezone": "Asia/Kolkata",
                    },
                )
                a.raise_for_status()
                daily = a.json().get("daily", {})
                times = daily.get("time", [])
                precip = np.array(daily.get("precipitation_sum", []), dtype=float)
                if len(times) > 0 and len(precip) > 0:
                    rain24 = float(precip[-1])
                    if len(precip) >= 16:
                        api15 = float(np.sum(precip[-16:-1] * w))
                    elif len(precip) > 1:
                        m = len(precip) - 1
                        api15 = float(np.sum(precip[:m] * w[-m:]))
                    else:
                        api15 = 0.0
                    data_fetched = True
            except Exception as e:
                log.warning("Archive API failed for (%.3f, %.3f) on %s: %s", lat, lon, target_date, e)

        if not data_fetched:
            # Forecast API
            try:
                r = client.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "daily": "precipitation_sum",
                        "past_days": 16,
                        "forecast_days": 2,
                        "timezone": "Asia/Kolkata",
                    },
                )
                r.raise_for_status()
                daily = r.json().get("daily", {})
                times = daily.get("time", [])
                precip = np.array(daily.get("precipitation_sum", []), dtype=float)
                if target_date in times:
                    idx = times.index(target_date)
                    rain24 = float(precip[idx])
                    if idx >= 15:
                        api15 = float(np.sum(precip[idx - 15 : idx] * w))
                    elif idx > 0:
                        api15 = float(np.sum(precip[:idx] * w[-idx:]))
                    else:
                        api15 = 0.0
                    data_fetched = True
                elif len(precip) > 0:
                    rain24 = float(precip[-1])
                    if len(precip) >= 16:
                        api15 = float(np.sum(precip[-16:-1] * w))
                    data_fetched = True
            except Exception as e:
                log.warning("Forecast API failed for (%.3f, %.3f) on %s: %s", lat, lon, target_date, e)

        if not data_fetched:
            flags.append("rainfall_fallback")
    finally:
        if own_client:
            client.close()

    return {"rain24": rain24, "api15": api15, "flags": flags}


def evaluate_trigger_state(
    rain24: float,
    api15: float,
    api_floor: float,
) -> tuple[str, bool]:
    """Evaluate dynamic trigger state and I-D threshold exceedance."""
    if np.isnan(api15) or api15 < 0.5 * api_floor:
        trig = "dry"
    elif api15 < api_floor:
        trig = "wet"
    else:
        trig = "saturated"

    if trig == "dry" and rain24 >= 20.0:
        trig = "wet"

    caine_24h_depth = caine_cumulative_depth_threshold(24.0)
    caine_hit = rain24 >= caine_24h_depth
    compound_hit = (trig == "saturated" and rain24 >= 50.0 and api15 >= 1.2 * api_floor)

    id_exceed = bool(caine_hit or compound_hit)
    return trig, id_exceed
