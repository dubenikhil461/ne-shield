"""Seed soil moisture sensors."""
from datetime import datetime, timezone
from app.core.database import SessionLocal
from app.models.sensor import Sensor


def seed():
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    # Study area: NE India landslide-prone district (approx coordinates)
    sensors = [
        ("SM-001", "Soil Moisture Station 1", 27.1500, 93.6200, 85),
        ("SM-002", "Soil Moisture Station 2", 27.1650, 93.6350, 92),
        ("SM-003", "Soil Moisture Station 3", 27.1400, 93.6100, 78),
        ("SM-004", "Soil Moisture Station 4", 27.1550, 93.6250, 70),
    ]

    for code, name, lat, lon, battery in sensors:
        existing = db.query(Sensor).filter(Sensor.sensor_code == code).first()
        if not existing:
            sensor = Sensor(
                sensor_code=code,
                name=name,
                sensor_type="SOIL_MOISTURE",
                latitude=lat,
                longitude=lon,
                status="ONLINE",
                last_seen_at=now,
                battery_level=battery,
            )
            db.add(sensor)
            print(f"  Created sensor: {code} at ({lat}, {lon})")

    db.commit()
    db.close()
    print("Sensors seeded.")


if __name__ == "__main__":
    seed()
