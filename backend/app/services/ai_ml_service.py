"""
AI/ML Integration Adapter.

Provides a clean interface to the AI/ML module (external `ai-ml/` directory).
When `AI_ML_MODE=demo`, deterministic DEMO outputs are produced locally so the
system is fully functional without the external model. When `AI_ML_MODE=real`,
the adapter attempts to import and use the external module, falling back to
demo on any error.

NOTE: The actual risk computation for the current release lives in
`app/services/risk_service.py`. This module is the integration seam that
connects to the external AI/ML model for susceptibility scores and any future
forecasts. Do NOT modify the `ai-ml/` directory itself.
"""
import logging
from typing import Any, Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIMLService:
    """Thin adapter over the external AI/ML module."""

    def __init__(self):
        self.mode = settings.AI_ML_MODE
        logger.info("AI/ML Service initialized in %s mode", self.mode)

    def get_mode(self) -> str:
        return self.mode

    def is_available(self) -> bool:
        """Whether the real AI/ML module is importable."""
        if self.mode != "real":
            return False
        try:
            import ai_ml  # noqa: F401
            return True
        except ImportError:
            return False

    def adapter_status(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "available": self.is_available(),
            "backend": "external" if self.is_available() else "demo",
        }

    # ------------------------------------------------------------------
    # Susceptibility scoring (used by risk_service in REAL mode).
    # In DEMO mode this returns None so risk_service uses its built-in
    # susceptibility values from the database.
    # ------------------------------------------------------------------
    def get_zone_susceptibility(self, zone_code: str) -> Optional[float]:
        if self.mode != "real":
            return None
        try:
            from ai_ml import susceptibility
            score = susceptibility(zone_code)
            return float(score)
        except Exception:  # noqa: BLE001
            logger.warning("AI/ML susceptibility lookup failed for %s", zone_code)
            return None


ai_ml_service = AIMLService()
