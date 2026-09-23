"""Authoritative operational hazard service with IoT telemetry integration.

Coordinates:
- Terrain Heuristic static susceptibility
- Dynamic hydrometeorological triggers (Open-Meteo or simulation)
- Caine threshold & API15
- Dedicated IoT sensor telemetry overriding single settlement susceptibility & warning tier
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.schemas.hazard import (
    HazardFeature,
    HazardFeatureCollection,
    HazardGeometry,
    HazardZoneProperties,
)
from app.services.hazard.settlements import load_master_settlements
from app.services.hazard.susceptibility import classify_static_susceptibility
from app.services.hazard.warning import evaluate_warning
from app.services.hazard.weather import (
    cluster_village_coordinates,
    fetch_weather_point,
)

log = logging.getLogger(__name__)


class OperationalHazardService:
    """Singleton service for authoritative landslide hazard prediction."""

    def __init__(self, base_dir: Path | None = None) -> None:
        if base_dir is None:
            self.base_dir = Path(__file__).resolve().parent.parent.parent.parent
        else:
            self.base_dir = base_dir

        self._settlements_df: pd.DataFrame | None = None
        self._floors: dict[str, Any] = {}
        self._cache: dict[str, HazardFeatureCollection] = {}
        # Stores IoT readings per settlement: {settlement_id: {"moisture": float, "offset": float, "updated_at": str}}
        self._iot_readings: dict[str, dict[str, Any]] = {}
        self._load_reference_data()

    def _load_reference_data(self) -> None:
        """Load master settlement registry and district trigger floors."""
        try:
            self._settlements_df = load_master_settlements(base_dir=self.base_dir)
            log.info("Loaded master settlement registry with %d settlements", len(self._settlements_df))
        except Exception as e:
            log.warning("Could not load master settlements: %s", e)
            self._settlements_df = None

    def get_district_floor(self, district: str) -> float:
        """Retrieve district historical 90th percentile monsoon API floor."""
        for k in (f"{district}_Nagaland", f"{district}_Assam", district):
            if k in self._floors and "jul2425_p90_api15" in self._floors[k]:
                return float(self._floors[k]["jul2425_p90_api15"])
        return 150.0

    def compute_zones(
        self,
        target_date: str | None = None,
        force_refresh: bool = False,
        mock_weather: dict[str, dict[str, Any]] | None = None,
    ) -> HazardFeatureCollection:
        """Compute operational warnings across all 1,386 settlements for target date."""
        if target_date is None:
            target_date = date.today().isoformat()

        cache_key = f"{target_date}_{'mock' if mock_weather else 'live'}"
        if not force_refresh and cache_key in self._cache:
            col = self._cache[cache_key]
            # Ensure IoT live overrides are reflected
            if self._iot_readings:
                self._apply_cached_iot_overrides(col)
            return col

        df = self._settlements_df
        if df is None:
            self._load_reference_data()
            df = self._settlements_df
            if df is None:
                raise RuntimeError("Master settlements not loaded")

        # Cluster coordinates to ~0.1 deg (~10 km) meteorological grid
        clusters = cluster_village_coordinates(
            df["lon"].to_numpy(), df["lat"].to_numpy(), grid_res=0.1
        )
        weather_by_cell: dict[tuple[float, float], dict[str, Any]] = {}

        if mock_weather is not None:
            for cell_coord in clusters:
                k_str = f"{cell_coord[0]},{cell_coord[1]}"
                weather_by_cell[cell_coord] = mock_weather.get(
                    k_str, {"rain24": 0.0, "api15": 30.0, "flags": []}
                )
        else:
            # Query Open-Meteo per cluster cell with graceful fallback
            import httpx

            client = httpx.Client(timeout=15.0)
            try:
                for cell_coord in clusters:
                    c_lat, c_lon = cell_coord
                    try:
                        weather_by_cell[cell_coord] = fetch_weather_point(
                            c_lat, c_lon, target_date, client=client
                        )
                    except Exception as err:
                        log.warning("Weather fetch failed for cell %s: %s", cell_coord, err)
                        weather_by_cell[cell_coord] = {
                            "rain24": 0.0,
                            "api15": float("nan"),
                            "flags": ["weather_error"],
                        }
            finally:
                client.close()

        features: list[HazardFeature] = []
        level_counts: dict[str, int] = {"green": 0, "yellow": 0, "orange": 0, "red": 0}

        for i, row in df.iterrows():
            sid = str(row["settlement_id"])
            d = str(row["district"])
            lat = float(row["lat"])
            lon = float(row["lon"])
            r_lat = round(round(lat / 0.1) * 0.1, 3)
            r_lon = round(round(lon / 0.1) * 0.1, 3)

            w_info = weather_by_cell.get(
                (r_lat, r_lon), {"rain24": 0.0, "api15": float("nan"), "flags": []}
            )
            rain24 = float(w_info.get("rain24", 0.0))
            api15_raw = w_info.get("api15")
            api15 = None if (api15_raw is None or np.isnan(api15_raw)) else float(api15_raw)

            api_floor = self.get_district_floor(d)
            base_s_score = float(row["static_susceptibility"])

            # Check if this settlement has an active IoT hardware reading
            iot_info = self._iot_readings.get(sid)
            s_score = base_s_score
            iot_m = None
            is_iot = False

            if iot_info is not None:
                is_iot = True
                iot_m = float(iot_info["moisture"])
                offset = iot_info.get("offset")
                if offset is not None:
                    s_score = float(np.clip(base_s_score + offset, 0.01, 0.99))
                else:
                    # Dynamically modulate susceptibility from IoT soil moisture:
                    # Moisture > 60% increases susceptibility progressively up to +0.35
                    # Moisture < 40% relieves susceptibility slightly
                    delta = (iot_m - 50.0) / 100.0 * 0.4
                    s_score = float(np.clip(base_s_score + delta, 0.05, 0.98))

                # Also elevate hydrometeorological trigger if soil moisture is saturated
                if iot_m >= 75.0 and (api15 is None or api15 < api_floor):
                    api15 = api_floor * 1.1

            decision = evaluate_warning(
                susceptibility_score=s_score,
                rain_24h_mm=rain24,
                api15_mm=api15,
                api_floor=api_floor,
            )

            # If IoT is attached, enrich explanation
            explanation = decision.explanation
            if is_iot and iot_m is not None:
                explanation = f"[IoT Live Sensor: {iot_m:.1f}% soil moisture] {explanation}"

            level_counts[decision.level] += 1

            props = HazardZoneProperties(
                settlement_id=sid,
                name=str(row.get("name", sid)),
                district=d,
                source=str(row.get("source", "LGD")),
                lon=round(lon, 5),
                lat=round(lat, 5),
                slope_deg=round(float(row["slope_deg"]), 2),
                elevation_m=round(float(row["elevation_m"]), 1),
                profile_curv=round(float(row["profile_curv"]), 5),
                plan_curv=round(float(row["plan_curv"]), 5),
                static_susceptibility=round(s_score, 4),
                susceptibility_tier=classify_static_susceptibility(s_score),  # type: ignore[arg-type]
                rain_24h_mm=decision.rain_24h_mm,
                api15_mm=decision.api15_mm,
                trigger_state=decision.trigger_state,  # type: ignore[arg-type]
                caine_exceedance=decision.caine_exceedance,
                caine_threshold_24h_mm=decision.caine_threshold_24h_mm,
                warning_level=decision.level,
                explanation=explanation,
                target_date=target_date,
                fetched_at=datetime.now(timezone.utc).isoformat(),
                iot_moisture=iot_m,
                is_iot_monitored=is_iot,
            )

            features.append(
                HazardFeature(
                    id=sid,
                    geometry=HazardGeometry(coordinates=[round(lon, 5), round(lat, 5)]),
                    properties=props,
                )
            )

        collection = HazardFeatureCollection(
            features=features,
            metadata={
                "target_date": target_date,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "total_settlements": len(features),
                "summary": level_counts,
                "architecture": "Terrain Heuristic + Dynamic Hydrometeorological Trigger + IoT Probes",
                "iot_monitored_settlements": list(self._iot_readings.keys()),
            },
        )

        self._cache[cache_key] = collection
        return collection

    def _apply_cached_iot_overrides(self, col: HazardFeatureCollection) -> None:
        """Apply active IoT readings onto already cached collections."""
        for feat in col.features:
            sid = feat.id
            if sid in self._iot_readings:
                info = self._iot_readings[sid]
                m = info["moisture"]
                feat.properties.is_iot_monitored = True
                feat.properties.iot_moisture = m

    def get_zone_by_id(
        self,
        settlement_id: str,
        target_date: str | None = None,
        mock_weather: dict[str, dict[str, Any]] | None = None,
    ) -> HazardFeature | None:
        """Find a single settlement by its unique settlement_id."""
        collection = self.compute_zones(target_date=target_date, mock_weather=mock_weather)
        for feat in collection.features:
            if feat.id == settlement_id:
                return feat
        return None

    def refresh_settlement_weather(
        self,
        settlement_id: str,
        target_date: str | None = None,
        mock: bool = False,
    ) -> HazardFeature | None:
        """Fetch live weather for a single settlement and recompute hazard state."""
        if target_date is None:
            target_date = date.today().isoformat()

        df = self._settlements_df
        if df is None:
            self._load_reference_data()
            df = self._settlements_df
            if df is None:
                return None

        match = df[df["settlement_id"] == settlement_id]
        if match.empty:
            return None

        row = match.iloc[0]
        lat = float(row["lat"])
        lon = float(row["lon"])
        d = str(row["district"])

        if mock:
            rain24 = 110.0 if "Kohima" in d else 65.0 if "Phek" in d else 15.0
            api15 = 210.0 if "Kohima" in d else 175.0 if "Phek" in d else 40.0
        else:
            w = fetch_weather_point(lat=lat, lon=lon, target_date=target_date)
            rain24 = float(w.get("rain24", 0.0))
            api15_raw = w.get("api15")
            api15 = None if (api15_raw is None or np.isnan(api15_raw)) else float(api15_raw)

        api_floor = self.get_district_floor(d)
        base_s_score = float(row["static_susceptibility"])

        iot_info = self._iot_readings.get(settlement_id)
        s_score = base_s_score
        iot_m = None
        is_iot = False

        if iot_info is not None:
            is_iot = True
            iot_m = float(iot_info["moisture"])
            offset = iot_info.get("offset")
            if offset is not None:
                s_score = float(np.clip(base_s_score + offset, 0.01, 0.99))
            else:
                delta = (iot_m - 50.0) / 100.0 * 0.4
                s_score = float(np.clip(base_s_score + delta, 0.05, 0.98))
            if iot_m >= 75.0 and (api15 is None or api15 < api_floor):
                api15 = api_floor * 1.1

        decision = evaluate_warning(
            susceptibility_score=s_score,
            rain_24h_mm=rain24,
            api15_mm=api15,
            api_floor=api_floor,
        )

        explanation = decision.explanation
        if is_iot and iot_m is not None:
            explanation = f"[IoT Live Sensor: {iot_m:.1f}% soil moisture] {explanation}"

        now_str = datetime.now(timezone.utc).isoformat()
        props = HazardZoneProperties(
            settlement_id=settlement_id,
            name=str(row.get("name", settlement_id)),
            district=d,
            source=str(row.get("source", "LGD")),
            lon=round(lon, 5),
            lat=round(lat, 5),
            slope_deg=round(float(row["slope_deg"]), 2),
            elevation_m=round(float(row["elevation_m"]), 1),
            profile_curv=round(float(row["profile_curv"]), 5),
            plan_curv=round(float(row["plan_curv"]), 5),
            static_susceptibility=round(s_score, 4),
            susceptibility_tier=classify_static_susceptibility(s_score),  # type: ignore[arg-type]
            rain_24h_mm=decision.rain_24h_mm,
            api15_mm=decision.api15_mm,
            trigger_state=decision.trigger_state,  # type: ignore[arg-type]
            caine_exceedance=decision.caine_exceedance,
            caine_threshold_24h_mm=decision.caine_threshold_24h_mm,
            warning_level=decision.level,
            explanation=explanation,
            target_date=target_date,
            fetched_at=now_str,
            iot_moisture=iot_m,
            is_iot_monitored=is_iot,
        )

        feat = HazardFeature(
            id=settlement_id,
            geometry=HazardGeometry(coordinates=[round(lon, 5), round(lat, 5)]),
            properties=props,
        )

        cache_key = f"{target_date}_{'mock' if mock else 'live'}"
        if cache_key in self._cache:
            col = self._cache[cache_key]
            for idx, existing_feat in enumerate(col.features):
                if existing_feat.id == settlement_id:
                    old_lvl = existing_feat.properties.warning_level
                    new_lvl = feat.properties.warning_level
                    if old_lvl != new_lvl and "summary" in col.metadata:
                        col.metadata["summary"][old_lvl] = max(0, col.metadata["summary"].get(old_lvl, 0) - 1)
                        col.metadata["summary"][new_lvl] = col.metadata["summary"].get(new_lvl, 0) + 1
                    col.features[idx] = feat
                    break

        return feat

    def apply_iot_reading(
        self,
        settlement_id: str,
        moisture_percent: float,
        susceptibility_offset: float | None = None,
        target_date: str | None = None,
    ) -> HazardFeature | None:
        """Apply a live IoT telemetry reading to a single settlement.

        Modifies this settlement's susceptibility and dynamically recalculates
        its warning level and marker color.
        """
        self._iot_readings[settlement_id] = {
            "moisture": moisture_percent,
            "offset": susceptibility_offset,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        # Invalidate in-memory caches to ensure fresh evaluation
        self._cache.clear()
        # Recompute single feature
        return self.refresh_settlement_weather(
            settlement_id=settlement_id,
            target_date=target_date,
            mock=False,
        )


# Global singleton instance
hazard_service = OperationalHazardService()
