"""
Dashboard router.

All endpoints require authentication.
Role-based data scoping is handled in the service layer.

Endpoints:
  GET /dashboard/kpis                     — KPI card counts
  GET /dashboard/overdue-returns          — ACTIVE allocations past due date
  GET /dashboard/upcoming-returns         — ACTIVE allocations due soon
  GET /dashboard/maintenance-activity     — Recent non-draft maintenance
  GET /dashboard/active-bookings          — Current/upcoming confirmed bookings
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.dashboard import (
    ActiveBookingsResponse,
    KPICards,
    MaintenanceActivityResponse,
    OverdueReturnsResponse,
    UpcomingReturnsResponse,
)
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/kpis",
    response_model=KPICards,
    summary="Get all KPI card counts for the dashboard",
)
def get_kpi_cards(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> KPICards:
    """
    Returns a single object with all counts needed to render the KPI cards.
    Role-scoped: employees see their own data; managers see their department;
    admins/auditors see system-wide totals.
    """
    return dashboard_service.get_kpi_cards(db, current_user)


@router.get(
    "/overdue-returns",
    response_model=OverdueReturnsResponse,
    summary="List active allocations past their expected return date",
)
def get_overdue_returns(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> OverdueReturnsResponse:
    """
    Ordered by most-overdue first.
    days_overdue is the number of days past the expected return date.
    """
    return dashboard_service.get_overdue_returns(db, current_user, limit, offset)


@router.get(
    "/upcoming-returns",
    response_model=UpcomingReturnsResponse,
    summary="List active allocations due within the next N days",
)
def get_upcoming_returns(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    days_ahead: int = Query(default=7, ge=1, le=90),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> UpcomingReturnsResponse:
    """
    Ordered by earliest due date first.
    Use days_ahead to widen or narrow the look-ahead window.
    """
    return dashboard_service.get_upcoming_returns(db, current_user, days_ahead, limit, offset)


@router.get(
    "/maintenance-activity",
    response_model=MaintenanceActivityResponse,
    summary="Recent maintenance requests (excluding drafts)",
)
def get_maintenance_activity(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=10, ge=1, le=50),
) -> MaintenanceActivityResponse:
    """
    Returns the most recently updated non-draft maintenance requests.
    Used to populate the activity feed on the dashboard.
    """
    return dashboard_service.get_maintenance_activity(db, current_user, limit)


@router.get(
    "/active-bookings",
    response_model=ActiveBookingsResponse,
    summary="Current and upcoming confirmed bookings",
)
def get_active_bookings(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=10, ge=1, le=50),
) -> ActiveBookingsResponse:
    """
    Returns CONFIRMED and PENDING bookings whose end_time is in the future,
    ordered by start_time ascending.
    """
    return dashboard_service.get_active_bookings(db, current_user, limit)
