"""End-to-end smoke tests for the merged NE-SHIELD API (Sections 1-12).

These tests exercise the live PostGIS-backed database via FastAPI's TestClient.
They verify that the Sections 1-6 modules (auth, maps, risk) and the Sections
7-12 modules (sensors, impact, field reports, alerts, health) work together after
the merge, and that the data seeding produced the expected row counts.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ADMIN = {"email": "admin@example.com", "password": "admin123"}


def auth_header() -> dict:
    res = client.post("/api/v1/auth/login", json=ADMIN)
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["services"]["database"]["status"] == "ok"
    assert body["services"]["sensors"]["total"] == 4


def test_auth_login_and_me():
    h = auth_header()
    me = client.get("/api/v1/auth/me", headers=h)
    assert me.status_code == 200
    assert me.json()["email"] == ADMIN["email"]
    assert me.json()["role"] == "ADMIN"


def test_auth_login_bad_password():
    res = client.post("/api/v1/auth/login", json={"email": ADMIN["email"], "password": "wrong"})
    assert res.status_code == 401


def test_risk_zones():
    h = auth_header()
    res = client.get("/api/v1/risk/zones", headers=h)
    assert res.status_code == 200
    data = res.json()
    assert len(data["data"]) == 10  # 10 seeded risk zones


def test_risk_current_and_detail():
    h = auth_header()
    cur = client.get("/api/v1/risk/current", headers=h)
    assert cur.status_code == 200
    assert len(cur.json()["data"]) == 10

    detail = client.get("/api/v1/risk/zones/1", headers=h)
    assert detail.status_code == 200
    assert detail.json()["zone_code"] == "A-01"

    history = client.get("/api/v1/risk/zones/1/history", headers=h)
    assert history.status_code == 200


def test_maps_geojson_layers():
    h = auth_header()
    study = client.get("/api/v1/maps/study-area", headers=h)
    assert study.status_code == 200
    assert len(study.json()["features"]) == 10

    roads = client.get("/api/v1/maps/roads", headers=h)
    assert roads.status_code == 200
    # Roads carry actual LINESTRING geometry after the seed fix
    assert len(roads.json()["features"]) == 6
    assert all(f["geometry"]["type"] in ("LineString", "MultiLineString") for f in roads.json()["features"])

    villages = client.get("/api/v1/maps/villages", headers=h)
    assert len(villages.json()["features"]) == 6

    sensors = client.get("/api/v1/maps/sensors", headers=h)
    assert len(sensors.json()["features"]) == 4

    reports = client.get("/api/v1/maps/field-reports", headers=h)
    assert len(reports.json()["features"]) == 5


def test_sensor_readings_ingestion_no_auth():
    res = client.post(
        "/api/v1/sensors/readings",
        json={
            "sensor_code": "SM-001",
            "timestamp": "2026-09-02T18:00:00Z",
            "moisture_percent": 75.0,
            "raw_value": 500,
            "battery_level": 80.0,
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["moisture_percent"] == 75.0


def test_sensors_list_and_readings():
    h = auth_header()
    sensors = client.get("/api/v1/sensors", headers=h)
    assert sensors.status_code == 200
    assert sensors.json()["total"] == 4

    readings = client.get("/api/v1/sensors/1/readings", headers=h)
    assert readings.status_code == 200
    # at least one reading (from ingestion test above, ordering not guaranteed)
    assert readings.json()["total"] >= 1


def test_impact():
    h = auth_header()
    roads = client.get("/api/v1/impact/roads", headers=h)
    assert roads.status_code == 200
    assert len(roads.json()["data"]) == 6

    villages = client.get("/api/v1/impact/villages", headers=h)
    assert villages.status_code == 200
    assert len(villages.json()["data"]) == 6

    zone = client.get("/api/v1/impact/zones/1", headers=h)
    assert zone.status_code == 200
    assert zone.json()["zone_code"] == "A-01"


def test_field_reports():
    h = auth_header()
    res = client.get("/api/v1/field-reports", headers=h)
    assert res.status_code == 200
    assert res.json()["total"] == 5


def test_alerts():
    h = auth_header()
    res = client.get("/api/v1/alerts", headers=h)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 4
    assert body["active_count"] >= 2
