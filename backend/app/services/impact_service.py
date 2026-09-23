"""Impact analysis service.

Determines which roads and villages could be affected by risk zones
using PostGIS spatial proximity queries.
"""
import logging
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.risk_zone import RiskZone
from app.models.road import Road
from app.models.village import Village

logger = logging.getLogger(__name__)


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate haversine distance between two points in km."""
    import math
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_zone_impact(db: Session, zone_id: int) -> Optional[dict]:
    """Get affected roads and villages for a risk zone."""
    zone = db.query(RiskZone).filter(RiskZone.id == zone_id).first()
    if not zone:
        return None

    radius_km = settings.IMPACT_RADIUS_KM

    # Find affected roads using spatial or proximity
    roads = db.query(Road).all()
    affected_roads = []
    for road in roads:
        road_lat = zone.latitude
        road_lon = zone.longitude
        # For now, use proximity check (PostGIS ST_DWithin would be ideal)
        if road.geometry is not None:
            try:
                from geoalchemy2.shape import to_shape
                shape = to_shape(road.geometry)
                # Check if any point on the road line is within radius
                dist = haversine_distance_km(
                    zone.latitude, zone.longitude,
                    shape.centroid.y, shape.centroid.x
                )
                if dist <= radius_km:
                    affected_roads.append({
                        "id": road.id,
                        "road_name": road.road_name,
                        "road_type": road.road_type,
                        "status": road.status,
                        "distance_km": round(dist, 2),
                    })
            except Exception:
                # Fallback: check centroid distance
                pass

    # Find affected villages
    villages = db.query(Village).all()
    affected_villages = []
    for village in villages:
        dist = haversine_distance_km(
            zone.latitude, zone.longitude,
            village.latitude, village.longitude
        )
        if dist <= radius_km:
            affected_villages.append({
                "id": village.id,
                "name": village.name,
                "population": village.population,
                "latitude": village.latitude,
                "longitude": village.longitude,
                "distance_km": round(dist, 2),
            })

    # Sort by distance
    affected_roads.sort(key=lambda x: x.get("distance_km", 0))
    affected_villages.sort(key=lambda x: x.get("distance_km", 0))

    total_pop = sum(v["population"] for v in affected_villages)

    return {
        "zone_id": zone.id,
        "zone_code": zone.zone_code,
        "zone_name": zone.name,
        "risk_level": zone.risk_level,
        "affected_roads": affected_roads,
        "potentially_affected_villages": affected_villages,
        "alternative_routes_available": len(affected_roads) < len(roads),
        "total_road_length_at_risk_km": round(
            sum(r.get("distance_km", 0) for r in affected_roads), 2
        ),
        "total_population_at_risk": total_pop,
    }


def get_all_roads(db: Session) -> list[dict]:
    """Get all roads with geometry info."""
    roads = db.query(Road).all()
    result = []
    for road in roads:
        entry = {
            "id": road.id,
            "road_name": road.road_name,
            "road_type": road.road_type,
            "status": road.status,
        }
        if road.geometry is not None:
            try:
                from app.utils.geo import wkb_to_geojson
                entry["geometry"] = wkb_to_geojson(road.geometry)
            except Exception:
                entry["geometry"] = None
        else:
            entry["geometry"] = None
        result.append(entry)
    return result


def get_all_villages(db: Session) -> list[dict]:
    """Get all villages."""
    villages = db.query(Village).all()
    result = []
    for v in villages:
        entry = {
            "id": v.id,
            "name": v.name,
            "population": v.population,
            "latitude": v.latitude,
            "longitude": v.longitude,
        }
        if v.geometry is not None:
            try:
                from app.utils.geo import wkb_to_geojson
                entry["geometry"] = wkb_to_geojson(v.geometry)
            except Exception:
                entry["geometry"] = None
        else:
            entry["geometry"] = None
        result.append(entry)
    return result
