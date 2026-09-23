"""Central API router.

Combines Sections 1-6 (auth, maps, risk) with Sections 7-12
(sensors, impact, field reports, alerts, health) into one API.
"""
from fastapi import APIRouter

from app.api.routes import auth as auth_routes
from app.api.routes import sensors as sensors_routes
from app.api.routes import risk as risk_routes
from app.api.routes import impact as impact_routes
from app.api.routes import maps as maps_routes
from app.api.routes import field_reports as field_reports_routes
from app.api.routes import alerts as alerts_routes
from app.api.routes import health as health_routes
from app.api.routes import hazard as hazard_routes

api_router = APIRouter(prefix="/api/v1")

# Sections 1-6: Authentication, Maps, Risk
api_router.include_router(auth_routes.router, prefix="/auth", tags=["Auth"])
api_router.include_router(maps_routes.router, prefix="/maps", tags=["Maps"])
api_router.include_router(risk_routes.router, prefix="/risk", tags=["Risk"])
api_router.include_router(hazard_routes.router, prefix="/hazard", tags=["Hazard Early Warning"])

# Sections 7-12: Sensors, Impact, Field Reports, Alerts, Health
api_router.include_router(sensors_routes.router, prefix="/sensors", tags=["Sensors"])
api_router.include_router(impact_routes.router, prefix="/impact", tags=["Impact"])
api_router.include_router(field_reports_routes.router, prefix="/field-reports", tags=["Field Reports"])
api_router.include_router(alerts_routes.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(health_routes.router, prefix="/health", tags=["Health"])
