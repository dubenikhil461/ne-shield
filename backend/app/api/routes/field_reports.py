"""Field report API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.field_report import (
    FieldReportCreate,
    FieldReportUpdate,
    FieldReportResponse,
    FieldReportListResponse,
)
from app.services import field_report_service
from app.utils.validators import validate_coordinates

router = APIRouter()


@router.get("", response_model=FieldReportListResponse)
def list_reports(
    report_status: str = Query(None, alias="status"),
    severity: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List field reports with optional filters."""
    reports, total = field_report_service.get_reports(
        db, status=report_status, severity=severity, page=page, page_size=page_size
    )
    return FieldReportListResponse(
        data=reports, total=total, page=page, page_size=page_size
    )


@router.post("", response_model=FieldReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    body: FieldReportCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new field report."""
    validate_coordinates(body.latitude, body.longitude)
    report = field_report_service.create_report(
        db, body.model_dump(), user_id=current_user["user_id"]
    )
    return report


@router.get("/{report_id}", response_model=FieldReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    """Get a single field report."""
    report = field_report_service.get_report_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Field report not found")
    return report


@router.patch("/{report_id}/status", response_model=FieldReportResponse)
def update_report_status(
    report_id: int,
    body: FieldReportUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update field report status (with transition validation)."""
    if body.status:
        try:
            report = field_report_service.update_report_status(db, report_id, body.status)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
        if not report:
            raise HTTPException(status_code=404, detail="Field report not found")
        return report

    # Update other fields
    report = field_report_service.get_report_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Field report not found")
    if body.severity:
        report.severity = body.severity
    if body.description:
        report.description = body.description
    db.commit()
    db.refresh(report)
    return report
