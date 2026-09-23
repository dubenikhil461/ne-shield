"""Alert management API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.alert import AlertResponse, AlertCreate, AlertListResponse
from app.services import alert_service

router = APIRouter()


@router.get("", response_model=AlertListResponse)
def list_alerts(
    alert_status: str = Query(None, alias="status"),
    alert_level: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List alerts with optional filters."""
    alerts, total = alert_service.get_alerts(
        db, status=alert_status, alert_level=alert_level, page=page, page_size=page_size
    )
    counts = alert_service.count_alerts_by_status(db)
    return AlertListResponse(
        data=alerts,
        total=total,
        active_count=counts["active"],
        acknowledged_count=counts["acknowledged"],
        resolved_count=counts["resolved"],
    )


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    """Get a single alert."""
    alert = alert_service.get_alert_by_id(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Acknowledge an active alert."""
    try:
        alert = alert_service.acknowledge_alert(db, alert_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Resolve an alert."""
    try:
        alert = alert_service.resolve_alert(db, alert_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
