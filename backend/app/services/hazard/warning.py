"""Authoritative landslide warning engine and deterministic explanation generator.

Single source of truth for:
- Warning levels (green, yellow, orange, red)
- Rule-based explanations (non-LLM)
- Fusion of terrain susceptibility and hydrometeorological triggers
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.services.hazard.susceptibility import (
    TERRAIN_CUTOFFS,
    classify_static_susceptibility,
)
from app.services.hazard.weather import (
    caine_cumulative_depth_threshold,
    evaluate_trigger_state,
)

WarningLevel = Literal["green", "yellow", "orange", "red"]


@dataclass(frozen=True)
class WarningDecision:
    level: WarningLevel
    susceptibility_score: float
    susceptibility_tier: str
    rain_24h_mm: float
    api15_mm: float | None
    trigger_state: str
    caine_exceedance: bool
    caine_threshold_24h_mm: float
    explanation: str


def evaluate_warning(
    susceptibility_score: float,
    rain_24h_mm: float,
    api15_mm: float | None,
    api_floor: float,
    cutoffs: dict[str, float] | None = None,
) -> WarningDecision:
    """Evaluate operational landslide warning level and generate deterministic explanation."""
    cuts = cutoffs if cutoffs is not None else TERRAIN_CUTOFFS
    cut_y = cuts.get("yellow", TERRAIN_CUTOFFS["yellow"])
    cut_o = cuts.get("orange", TERRAIN_CUTOFFS["orange"])
    cut_r = cuts.get("red", TERRAIN_CUTOFFS["red"])

    effective_api15 = float("nan") if api15_mm is None else float(api15_mm)
    trig_state, id_exceed = evaluate_trigger_state(rain_24h_mm, effective_api15, api_floor)
    caine_depth = round(caine_cumulative_depth_threshold(24.0), 2)
    s_tier = classify_static_susceptibility(susceptibility_score)

    if susceptibility_score >= cut_r and id_exceed:
        level: WarningLevel = "red"
    elif susceptibility_score >= cut_o and trig_state in ("wet", "saturated"):
        level: WarningLevel = "orange"
    elif susceptibility_score >= cut_y and trig_state != "dry":
        level: WarningLevel = "yellow"
    else:
        level: WarningLevel = "green"

    explanation = generate_warning_explanation(
        level=level,
        susceptibility=susceptibility_score,
        rain24=rain_24h_mm,
        api15=api15_mm,
        trig_state=trig_state,
        id_exceed=id_exceed,
        caine_depth=caine_depth,
        cut_y=cut_y,
        cut_o=cut_o,
        cut_r=cut_r,
    )

    return WarningDecision(
        level=level,
        susceptibility_score=round(susceptibility_score, 4),
        susceptibility_tier=s_tier,
        rain_24h_mm=round(rain_24h_mm, 1),
        api15_mm=None if api15_mm is None else round(api15_mm, 1),
        trigger_state=trig_state,
        caine_exceedance=id_exceed,
        caine_threshold_24h_mm=caine_depth,
        explanation=explanation,
    )


def generate_warning_explanation(
    level: WarningLevel,
    susceptibility: float,
    rain24: float,
    api15: float | None,
    trig_state: str,
    id_exceed: bool,
    caine_depth: float,
    cut_y: float,
    cut_o: float,
    cut_r: float,
) -> str:
    """Generate a deterministic, rule-based explanation without using an LLM."""
    api_str = f"{api15:.1f} mm" if api15 is not None else "unavailable"

    if level == "red":
        if rain24 >= caine_depth:
            return (
                f"Red alert because terrain has critical susceptibility ({susceptibility:.2f} >= {cut_r:.2f}) "
                f"and 24h rainfall ({rain24:.1f} mm) has exceeded the Caine threshold ({caine_depth:.1f} mm)."
            )
        return (
            f"Red alert because terrain has critical susceptibility ({susceptibility:.2f} >= {cut_r:.2f}) "
            f"and severe antecedent saturation ({api_str}) has activated the compound trigger under {rain24:.1f} mm rainfall."
        )

    if level == "orange":
        return (
            f"Orange warning because the terrain has high susceptibility ({susceptibility:.2f} >= {cut_o:.2f}) "
            f"and antecedent rainfall has activated the {trig_state} hydrometeorological trigger (API15 {api_str})."
        )

    if level == "yellow":
        return (
            f"Yellow watch because terrain susceptibility is elevated ({susceptibility:.2f} >= {cut_y:.2f}) "
            f"with active {trig_state} rainfall ({rain24:.1f} mm), remaining below severe saturation thresholds."
        )

    # Green level
    if susceptibility >= cut_y:
        return (
            f"Green because current rainfall conditions ({rain24:.1f} mm, {trig_state}) are below the warning "
            f"trigger despite elevated terrain susceptibility ({susceptibility:.2f})."
        )
    if trig_state != "dry":
        return (
            f"Green because terrain susceptibility is low ({susceptibility:.2f} < {cut_y:.2f}) "
            f"despite active {trig_state} rainfall ({rain24:.1f} mm)."
        )
    return (
        f"Green because terrain susceptibility is low ({susceptibility:.2f}) and rainfall conditions "
        f"remain dry ({rain24:.1f} mm)."
    )
