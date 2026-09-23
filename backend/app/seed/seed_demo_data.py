"""Seed demo field reports and alerts."""
from datetime import datetime, timezone, timedelta
from app.core.database import SessionLocal
from app.models.field_report import FieldReport
from app.models.alert import Alert
from app.models.risk_zone import RiskZone
from app.models.user import User


def seed():
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    # Get admin user for reports
    admin = db.query(User).filter(User.email == "admin@example.com").first()
    field_user = db.query(User).filter(User.email == "field@example.com").first()
    user_id = (field_user or admin or User(id=1)).id

    # ---- Field Reports ----
    reports_data = [
        ("FR-DEMO-0001", user_id, "Visible crack formation along hillside trail near Zone A-01. "
         "Soil appears saturated after 3 days of continuous rain.", 27.153, 93.617, "HIGH", "VERIFIED"),
        ("FR-DEMO-0002", user_id, "Minor debris flow observed on Ridge Access Track. "
         "Road partially blocked.", 27.158, 93.615, "MEDIUM", "PENDING"),
        ("FR-DEMO-0003", user_id, "Water seepage increasing near bridge foundation. "
         "Area appears unstable.", 27.150, 93.633, "HIGH", "PENDING"),
        ("FR-DEMO-0004", user_id, "Routine inspection - no visible issues. "
         "Moisture sensors normal.", 27.145, 93.625, "LOW", "RESOLVED"),
        ("FR-DEMO-0005", user_id, "New tension cracks noticed on slope above "
         "Dolong Village. Residents concerned.", 27.148, 93.619, "CRITICAL", "VERIFIED"),
    ]

    for code, uid, desc, lat, lon, sev, status in reports_data:
        existing = db.query(FieldReport).filter(FieldReport.report_code == code).first()
        if not existing:
            report = FieldReport(
                report_code=code,
                reported_by=uid,
                description=desc,
                latitude=lat,
                longitude=lon,
                severity=sev,
                status=status,
                created_at=now - timedelta(hours=6),
            )
            db.add(report)
            print(f"  Created field report: {code} [{sev}] [{status}]")

    # ---- Alerts ----
    zones = db.query(RiskZone).all()
    zone_map = {z.zone_code: z for z in zones}

    alerts_data = [
        ("ALT-DEMO-0001", "A-01", "HIGH", "High Risk Alert - Zone A-01",
         "Zone A-01 (Upper Ridge) showing elevated landslide risk.\n\nReasons:\n- High terrain susceptibility\n- Soil moisture at 78%\n- Moisture increasing rapidly",
         "HIGH susceptibility + elevated moisture", "ACTIVE"),
        ("ALT-DEMO-0002", "A-05", "CRITICAL", "Critical Risk - Zone A-05",
         "Zone A-05 (Ridge South) at critical risk level.\n\nImmediate attention required.\n\nFactors:\n- Critical susceptibility score\n- Soil moisture above threshold",
         "Critical susceptibility + high moisture", "ACKNOWLEDGED"),
        ("ALT-DEMO-0003", "B-02", "HIGH", "High Risk - Bridge Area",
         "Zone B-02 near bridge crossing showing high risk.\n\nRoad infrastructure may be affected.",
         "High susceptibility + increasing moisture", "ACTIVE"),
        ("ALT-DEMO-0004", "A-03", "MEDIUM", "Moderate Risk - River Bank",
         "Zone A-03 river bank area at moderate risk.\n\nMonitoring recommended.",
         "Moderate susceptibility", "RESOLVED"),
    ]

    for code, zone_code, level, title, message, reason, status in alerts_data:
        existing = db.query(Alert).filter(Alert.alert_code == code).first()
        if not existing:
            zone = zone_map.get(zone_code)
            if not zone:
                continue
            alert = Alert(
                alert_code=code,
                risk_zone_id=zone.id,
                alert_level=level,
                title=title,
                message=message,
                reason=reason,
                status=status,
                created_at=now - timedelta(hours=4),
            )
            if status == "RESOLVED":
                alert.resolved_at = now - timedelta(hours=1)
            db.add(alert)
            print(f"  Created alert: {code} [{level}] [{status}]")

    db.commit()
    db.close()
    print("Demo data seeded.")


if __name__ == "__main__":
    seed()
