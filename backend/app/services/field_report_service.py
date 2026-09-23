"""Field report service."""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.field_report import FieldReport

logger = logging.getLogger(__name__)

# Valid status transitions
VALID_TRANSITIONS = {
    "PENDING": ["VERIFIED", "REJECTED"],
    "VERIFIED": ["RESOLVED"],
    "REJECTED": [],
    "RESOLVED": [],
}


def generate_report_code() -> str:
    """Generate a unique report code."""
    return f"FR-{uuid.uuid4().hex[:8].upper()}"


def create_report(db: Session, data: dict, user_id: int) -> FieldReport:
    """Create a new field report."""
    from app.utils.validators import validate_coordinates
    validate_coordinates(data["latitude"], data["longitude"])

    report = FieldReport(
        report_code=generate_report_code(),
        reported_by=user_id,
        description=data["description"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        severity=data.get("severity", "MEDIUM"),
        photo_url=data.get("photo_url"),
        status="PENDING",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    logger.info(f"Field report created: {report.report_code} by user {user_id}")
    return report


def get_reports(
    db: Session,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[list[FieldReport], int]:
    """Get paginated field reports with optional filters."""
    query = db.query(FieldReport)
    if status:
        query = query.filter(FieldReport.status == status)
    if severity:
        query = query.filter(FieldReport.severity == severity)

    total = query.count()
    reports = (
        query.order_by(desc(FieldReport.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return reports, total


def get_report_by_id(db: Session, report_id: int) -> Optional[FieldReport]:
    """Get a single field report."""
    return db.query(FieldReport).filter(FieldReport.id == report_id).first()


def update_report_status(
    db: Session, report_id: int, new_status: str
) -> Optional[FieldReport]:
    """Update report status with transition validation."""
    report = db.query(FieldReport).filter(FieldReport.id == report_id).first()
    if not report:
        return None

    allowed = VALID_TRANSITIONS.get(report.status, [])
    if new_status not in allowed:
        logger.warning(
            f"Invalid transition: {report.status} -> {new_status} for {report.report_code}"
        )
        raise ValueError(
            f"Cannot transition from '{report.status}' to '{new_status}'. "
            f"Allowed: {allowed or 'none'}"
        )

    report.status = new_status
    db.commit()
    db.refresh(report)
    logger.info(f"Report {report.report_code} status: {report.status} -> {new_status}")
    return report
