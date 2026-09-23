"""Seed geographic data: risk zones, roads, villages, susceptibility."""
from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.risk_zone import RiskZone
from app.models.road import Road
from app.models.village import Village
from app.models.susceptibility import SusceptibilityZone

# Study area coordinates: NE India district
BASE_LAT = 27.15
BASE_LON = 93.62


def seed():
    db = SessionLocal()

    # ---- Risk Zones (10 zones) ----
    zones_data = [
        ("A-01", "Zone A-01: Upper Ridge",    27.155, 93.615, "HIGH",    0.72, 0.80),
        ("A-02", "Zone A-02: Valley Slope",   27.150, 93.620, "MEDIUM",  0.48, 0.55),
        ("A-03", "Zone A-03: River Bank",     27.145, 93.625, "HIGH",    0.68, 0.75),
        ("A-04", "Zone A-04: Hillside East",  27.160, 93.630, "LOW",     0.25, 0.30),
        ("A-05", "Zone A-05: Ridge South",    27.140, 93.610, "CRITICAL", 0.85, 0.88),
        ("B-01", "Zone B-01: Forest Trail",   27.155, 93.640, "MEDIUM",  0.42, 0.50),
        ("B-02", "Zone B-02: Bridge Area",    27.150, 93.635, "HIGH",    0.65, 0.70),
        ("B-03", "Zone B-03: Settlement Edge",27.145, 93.645, "LOW",     0.20, 0.25),
        ("B-04", "Zone B-04: Gully Zone",     27.160, 93.615, "MEDIUM",  0.50, 0.52),
        ("B-05", "Zone B-05: Upper Catchment",27.165, 93.625, "HIGH",    0.70, 0.78),
    ]

    for code, name, lat, lon, level, risk, susc in zones_data:
        existing = db.query(RiskZone).filter(RiskZone.zone_code == code).first()
        if not existing:
            zone = RiskZone(
                zone_code=code,
                name=name,
                risk_level=level,
                risk_score=risk,
                latitude=lat,
                longitude=lon,
                susceptibility_score=susc,
            )
            db.add(zone)
            print(f"  Created risk zone: {code} [{level}]")

    # ---- Roads (6 roads) ----
    roads_data = [
        ("District Highway NH-101",  "highway",   27.150, 93.620, 27.165, 93.635, "OPEN"),
        ("Valley Road",              "secondary", 27.148, 93.615, 27.158, 93.630, "OPEN"),
        ("Ridge Access Track",       "tertiary",  27.155, 93.610, 27.165, 93.620, "AT_RISK"),
        ("Settlement Link Road",     "secondary", 27.140, 93.640, 27.150, 93.645, "OPEN"),
        ("Bridge Crossing Road",     "tertiary",  27.148, 93.630, 27.155, 93.638, "OPEN"),
        ("Upper Ridge Trail",        "tertiary",  27.155, 93.612, 27.162, 93.622, "AT_RISK"),
    ]

    for name, rtype, lat1, lon1, lat2, lon2, status in roads_data:
        existing = db.query(Road).filter(Road.road_name == name).first()
        if not existing:
            road = Road(
                road_name=name,
                road_type=rtype,
                status=status,
                geometry=func.ST_GeomFromText(
                    f"LINESTRING({lon1} {lat1}, {lon2} {lat2})", 4326
                ),
            )
            db.add(road)
            print(f"  Created road: {name} [{status}]")

    # ---- Villages (6 villages) ----
    villages_data = [
        ("Dolong Village",     850,  27.148, 93.618),
        ("Ridge Settlement",   420,  27.158, 93.628),
        ("Valley Hamlet",      1200, 27.142, 93.622),
        ("Bridge Colony",      650,  27.150, 93.635),
        ("Hillside Village",   380,  27.162, 93.615),
        ("Upper Catchment",    290,  27.165, 93.625),
    ]

    for name, pop, lat, lon in villages_data:
        existing = db.query(Village).filter(Village.name == name).first()
        if not existing:
            village = Village(name=name, population=pop, latitude=lat, longitude=lon)
            db.add(village)
            print(f"  Created village: {name} (pop: {pop})")

    # ---- Susceptibility Zones ----
    for code, name, lat, lon, level, risk, susc in zones_data:
        existing = db.query(SusceptibilityZone).filter(
            SusceptibilityZone.zone_code == code
        ).first()
        if not existing:
            sz = SusceptibilityZone(
                zone_code=code,
                susceptibility_score=susc,
                source="demo",
            )
            db.add(sz)
            print(f"  Created susceptibility: {code} (score: {susc})")

    db.commit()
    db.close()
    print("Geo data seeded.")


if __name__ == "__main__":
    seed()
