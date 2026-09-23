"""Master settlement registry management.

Provides access to the 1,386 verified settlements across the 9-district pilot:
- Kohima, Mon, Mokokchung, Dimapur, Peren, Phek, Wokha (Nagaland)
- Sivasagar, Charaideo (Assam)
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any
import pandas as pd

log = logging.getLogger(__name__)

PILOT_DISTRICTS: list[str] = [
    "Kohima",
    "Mon",
    "Mokokchung",
    "Dimapur",
    "Peren",
    "Phek",
    "Wokha",
    "Sivasagar",
    "Charaideo",
]


def load_master_settlements(base_dir: Path = Path(".")) -> pd.DataFrame:
    """Load the authoritative master settlement registry of 1,386 verified settlements."""
    candidate_paths = [
        base_dir / "data/boundaries/pilot9_settlements_master.csv",
        base_dir / "backend/data/boundaries/pilot9_settlements_master.csv",
        Path("data/boundaries/pilot9_settlements_master.csv"),
    ]
    for p in candidate_paths:
        if p.exists():
            return pd.read_csv(p)

    # Check geojson fallback
    candidate_geo = [
        base_dir / "data/boundaries/pilot9_settlements_master.geojson",
        base_dir / "backend/data/boundaries/pilot9_settlements_master.geojson",
        Path("data/boundaries/pilot9_settlements_master.geojson"),
    ]
    for p in candidate_geo:
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
            rows = []
            for feat in data.get("features", []):
                coords = feat.get("geometry", {}).get("coordinates", [0.0, 0.0])
                props = feat.get("properties", {})
                props["lon"] = coords[0]
                props["lat"] = coords[1]
                rows.append(props)
            return pd.DataFrame(rows)

    raise FileNotFoundError("Master settlement registry not found in data/boundaries/")


def get_district_summary(base_dir: Path = Path(".")) -> list[dict[str, Any]]:
    """Return summary metadata and settlement counts for each pilot district."""
    df = load_master_settlements(base_dir=base_dir)
    summaries = []
    for d in PILOT_DISTRICTS:
        d_df = df[df["district"] == d]
        summaries.append({
            "district": d,
            "state": "Assam" if d in ("Sivasagar", "Charaideo") else "Nagaland",
            "terrain_type": "plains" if d in ("Sivasagar", "Charaideo") else "hills",
            "settlement_count": len(d_df),
            "mean_slope_deg": round(float(d_df["slope_deg"].mean()), 1) if len(d_df) else 0.0,
            "mean_elevation_m": round(float(d_df["elevation_m"].mean()), 1) if len(d_df) else 0.0,
            "critical_susceptibility_count": int((d_df["susceptibility_tier"] == "critical").sum()),
            "high_susceptibility_count": int((d_df["susceptibility_tier"] == "high").sum()),
            "moderate_susceptibility_count": int((d_df["susceptibility_tier"] == "moderate").sum()),
            "low_susceptibility_count": int((d_df["susceptibility_tier"] == "low").sum()),
        })
    return summaries
