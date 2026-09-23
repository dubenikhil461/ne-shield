"""GeoJSON and spatial utility helpers."""
from typing import Any, Dict, List, Optional
from shapely import wkt
from geoalchemy2.shape import to_shape
import json


def wkb_to_geojson(geoalchemy_geom) -> Optional[Dict]:
    """Convert a GeoAlchemy2 geometry column value to a GeoJSON-compatible dict."""
    if geoalchemy_geom is None:
        return None
    try:
        shape = to_shape(geoalchemy_geom)
        return json.loads(shapely_to_geojson(shape))
    except Exception:
        return None


def shapely_to_geojson(shape) -> str:
    """Convert a Shapely geometry to GeoJSON string."""
    from shapely.geometry import mapping
    return json.dumps(mapping(shape))


def point_to_geojson_feature(
    lat: float, lon: float, properties: Optional[Dict] = None
) -> Dict[str, Any]:
    """Create a GeoJSON Feature for a point."""
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": properties or {},
    }


def features_to_featurecollection(features: List[Dict]) -> Dict[str, Any]:
    """Wrap a list of GeoJSON Features in a FeatureCollection."""
    return {"type": "FeatureCollection", "features": features}
