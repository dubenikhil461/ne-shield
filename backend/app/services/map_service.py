"""Map (GeoJSON) service for GIS layers.

Builds GeoJSON FeatureCollections for the interactive map from
PostGIS geometry columns using ST_AsGeoJSON for reliable output.
"""
import json
import logging
from typing import Optional

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.risk_zone import RiskZone
from app.models.road import Road
from app.models.village import Village
from app.models.sensor import Sensor
from app.models.field_report import FieldReport

logger = logging.getLogger(__name__)


def _feature(geometry_geojson: Optional[str], properties: dict) -> dict:
    if not geometry_geojson:
        return None
    return {
        "type": "Feature",
        "geometry": json.loads(geometry_geojson),
        "properties": properties,
    }


def _as_geojson(db: Session, geom) -> Optional[str]:
    """Serialize a geometry column value to GeoJSON.

    The geometry is bound as its raw WKB and converted on the server to avoid
    the psycopg3 'cannot adapt type WKBElement' error seen with ST_AsGeoJSON(:geom).
    """
    if geom is None:
        return None
    wkb = getattr(geom, "data", None)
    if isinstance(wkb, (bytes, bytearray)):
        wkb = bytes(wkb)
    if not wkb:
        return None
    return db.execute(
        text("SELECT ST_AsGeoJSON(ST_GeomFromEWKB(:wkb)) AS gj"),
        {"wkb": wkb},
    ).scalar()


def _point_feature(lon: float, lat: float, properties: dict) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": properties,
    }


def get_study_area_geojson(db: Session) -> dict:
    features = []
    rows = db.query(RiskZone).all()
    for z in rows:
        if z.geometry is not None:
            geom = _as_geojson(db, z.geometry)
            props = {
                "zone_id": z.id,
                "zone_code": z.zone_code,
                "name": z.name,
                "risk_level": z.risk_level,
                "risk_score": z.risk_score,
                "susceptibility_score": z.susceptibility_score,
            }
            feature = _feature(geom, props)
            if feature:
                features.append(feature)
        else:
            props = {
                "zone_id": z.id,
                "zone_code": z.zone_code,
                "name": z.name,
                "risk_level": z.risk_level,
                "risk_score": z.risk_score,
                "susceptibility_score": z.susceptibility_score,
            }
            features.append(_point_feature(z.longitude, z.latitude, props))
    return _collection(features)


def get_roads_geojson(db: Session) -> dict:
    features = []
    rows = db.query(Road).all()
    for r in rows:
        geom = _as_geojson(db, r.geometry)
        props = {
            "id": r.id,
            "road_name": r.road_name,
            "road_type": r.road_type,
            "status": r.status,
        }
        feature = _feature(geom, props)
        if feature:
            features.append(feature)
    return _collection(features)


def get_villages_geojson(db: Session) -> dict:
    features = []
    rows = db.query(Village).all()
    for v in rows:
        props = {"id": v.id, "name": v.name, "population": v.population}
        if v.geometry is not None:
            geom = _as_geojson(db, v.geometry)
            feature = _feature(geom, props)
            if feature:
                features.append(feature)
        else:
            features.append(_point_feature(v.longitude, v.latitude, props))
    return _collection(features)


def get_sensors_geojson(db: Session) -> dict:
    features = []
    rows = db.query(Sensor).all()
    for s in rows:
        props = {
            "id": s.id,
            "sensor_code": s.sensor_code,
            "name": s.name,
            "sensor_type": s.sensor_type,
            "status": s.status,
            "battery_level": s.battery_level,
            "last_seen_at": s.last_seen_at.isoformat() if s.last_seen_at else None,
        }
        features.append(_point_feature(s.longitude, s.latitude, props))
    return _collection(features)


def get_field_reports_geojson(db: Session) -> dict:
    features = []
    rows = db.query(FieldReport).all()
    for r in rows:
        props = {
            "id": r.id,
            "report_code": r.report_code,
            "description": r.description,
            "severity": r.severity,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        features.append(_point_feature(r.longitude, r.latitude, props))
    return _collection(features)


def _collection(features: list) -> dict:
    return {"type": "FeatureCollection", "features": features}
