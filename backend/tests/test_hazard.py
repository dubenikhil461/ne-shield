"""Tests for the integrated Landslide Hazard Early Warning system and IoT telemetry."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_hazard_health():
    """Verify health and model provenance endpoint."""
    res = client.get("/api/v1/hazard/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["settlements_count"] == 1386
    assert data["districts_count"] == 9
    assert "Terrain Heuristic" in data["architecture"]


def test_hazard_districts():
    """Verify district summary counts for all 9 pilot districts."""
    res = client.get("/api/v1/hazard/districts")
    assert res.status_code == 200
    districts = res.json()
    assert len(districts) == 9
    district_names = {d["district"] for d in districts}
    assert "Kohima" in district_names
    assert "Mokokchung" in district_names
    assert "Sivasagar" in district_names


def test_hazard_zones_mock():
    """Verify operational hazard computation over all 1,386 settlements in mock scenario."""
    res = client.get("/api/v1/hazard/zones?mock=true")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 1386
    summary = data["metadata"]["summary"]
    assert "green" in summary
    assert "yellow" in summary
    assert "orange" in summary
    assert "red" in summary
    assert summary["green"] + summary["yellow"] + summary["orange"] + summary["red"] == 1386


def test_hazard_single_zone():
    """Verify single settlement detail and explanation."""
    res = client.get("/api/v1/hazard/zones/PMGSY_0137?mock=true")
    assert res.status_code == 200
    feat = res.json()
    assert feat["id"] == "PMGSY_0137"
    props = feat["properties"]
    assert props["name"] == "Kashanyu"
    assert props["district"] == "Kohima"
    assert props["slope_deg"] > 20
    assert len(props["explanation"]) > 0


def test_iot_moisture_override():
    """Verify IoT chip telemetry modifies settlement susceptibility & warning tier."""
    # Send extreme moisture to settlement PMGSY_0137
    res = client.post(
        "/api/v1/hazard/iot/reading",
        json={
            "settlement_id": "PMGSY_0137",
            "moisture_percent": 95.0,
            "device_id": "TEST-IOT-PROBE",
        },
    )
    assert res.status_code == 200
    feat = res.json()
    props = feat["properties"]
    assert props["is_iot_monitored"] is True
    assert props["iot_moisture"] == 95.0
    # Warning level must reflect elevated saturation (orange or red)
    assert props["warning_level"] in ("orange", "red")
    assert "IoT Live Sensor" in props["explanation"]


def test_hazard_bulletin():
    """Verify daily hazard bulletin aggregation endpoint."""
    res = client.get("/api/v1/hazard/bulletin?mock=true")
    assert res.status_code == 200
    bulletin = res.json()
    assert bulletin["total_settlements"] == 1386
    assert "warning_breakdown" in bulletin
