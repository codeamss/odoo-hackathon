"""
Dashboard service — all KPI aggregation and list queries.

Design choices:
  - Single-query aggregations using SQLAlchemy func.count + case expressions
    to avoid N+1 and minimise round-trips.
  - "Today" for maintenance is the calendar day in UTC.
  - Overdue = ACTIVE allocation where expected_return_date < now().
  - Upcoming = ACTIVE allocation where expected_return_date is within
    the next `days_ahead` days (default 7).
  - Role-aware: EMPLOYEE sees only their own allocations/bookings;
    MANAGER sees their department; ADMIN/SUPER_ADMIN/AUDITOR see everything.
"""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, and_, or_
from sqlalchemy.orm import Session, joinedload

from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.models.booking import Booking
from app.models.department import Department
from app.models.enums import (
    AllocationStatus,
    AssetStatus,
    BookingStatus,
    MaintenanceStatus,
    UserRole,
)
from app.models.maintenance_request import MaintenanceRequest
from app.models.user import User
from app.schemas.dashboard import (
    ActiveBookingItem,
    ActiveBookingsResponse,
    KPICards,
    MaintenanceActivityItem,
    MaintenanceActivityResponse,
    OverdueReturnsResponse,
    ReturnItem,
    UpcomingReturnsResponse,
)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _is_admin_or_above(role: UserRole) -> bool:
    return role in (UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.AUDITOR)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _today_utc_start() -> datetime:
    n = _now_utc()
    return n.replace(hour=0, minute=0, second=0, microsecond=0)


def _today_utc_end() -> datetime:
    return _today_utc_start() + timedelta(days=1)


# ── KPI aggregation ────────────────────────────────────────────────────────────

def get_kpi_cards(db: Session, current_user: User) -> KPICards:
    """
    Return all KPI counts in a minimal number of DB round-trips.
    """
    now = _now_utc()
    today_start = _today_utc_start()
    today_end = _today_utc_end()
    upcoming_cutoff = now + timedelta(days=7)

    # ── Asset status counts (single query, all roles see global asset pool) ──
    asset_counts = (
        db.query(
            func.count(case((Asset.status == AssetStatus.AVAILABLE, 1))).label("available"),
            func.count(case((Asset.status == AssetStatus.ALLOCATED, 1))).label("allocated"),
            func.count(case((Asset.status == AssetStatus.UNDER_MAINTENANCE, 1))).label("maintenance"),
            func.count(case((Asset.status == AssetStatus.RESERVED, 1))).label("reserved"),
            func.count(Asset.id).label("total"),
        )
        .one()
    )

    # ── Maintenance today ──────────────────────────────────────────────────────
    maint_q = db.query(func.count(MaintenanceRequest.id)).filter(
        MaintenanceRequest.status.in_([
            MaintenanceStatus.SUBMITTED,
            MaintenanceStatus.UNDER_REVIEW,
            MaintenanceStatus.APPROVED,
            MaintenanceStatus.IN_PROGRESS,
        ]),
        MaintenanceRequest.created_at >= today_start,
        MaintenanceRequest.created_at < today_end,
    )
    if not _is_admin_or_above(current_user.role):
        if current_user.role == UserRole.MANAGER and current_user.department_id:
            # Manager sees requests for assets in their department
            maint_q = maint_q.join(Asset).filter(
                Asset.department_id == current_user.department_id
            )
        else:
            maint_q = maint_q.filter(
                MaintenanceRequest.requested_by_id == current_user.id
            )
    maintenance_today = maint_q.scalar() or 0

    # ── Active & pending bookings ──────────────────────────────────────────────
    booking_q = db.query(
        func.count(case((Booking.status == BookingStatus.CONFIRMED, 1))).label("confirmed"),
        func.count(case((Booking.status == BookingStatus.PENDING, 1))).label("pending"),
    ).filter(
        Booking.end_time >= now,          # only future/ongoing bookings
    )
    if not _is_admin_or_above(current_user.role):
        if current_user.role == UserRole.MANAGER and current_user.department_id:
            booking_q = booking_q.join(Asset).filter(
                Asset.department_id == current_user.department_id
            )
        else:
            booking_q = booking_q.filter(Booking.booked_by_id == current_user.id)
    booking_counts = booking_q.one()

    # ── Overdue & upcoming returns ─────────────────────────────────────────────
    alloc_q = db.query(
        func.count(case((
            and_(
                Allocation.expected_return_date.isnot(None),
                Allocation.expected_return_date < now,
            ), 1
        ))).label("overdue"),
        func.count(case((
            and_(
                Allocation.expected_return_date.isnot(None),
                Allocation.expected_return_date >= now,
                Allocation.expected_return_date <= upcoming_cutoff,
            ), 1
        ))).label("upcoming"),
    ).filter(Allocation.status == AllocationStatus.ACTIVE)

    if not _is_admin_or_above(current_user.role):
        if current_user.role == UserRole.MANAGER and current_user.department_id:
            alloc_q = alloc_q.filter(
                Allocation.allocated_to_dept_id == current_user.department_id
            )
        else:
            alloc_q = alloc_q.filter(
                Allocation.allocated_to_user_id == current_user.id
            )
    alloc_counts = alloc_q.one()

    return KPICards(
        assets_available=asset_counts.available or 0,
        assets_allocated=asset_counts.allocated or 0,
        assets_under_maintenance=asset_counts.maintenance or 0,
        assets_reserved=asset_counts.reserved or 0,
        total_assets=asset_counts.total or 0,
        maintenance_today=maintenance_today,
        active_bookings=booking_counts.confirmed or 0,
        pending_bookings=booking_counts.pending or 0,
        overdue_returns=alloc_counts.overdue or 0,
        upcoming_returns=alloc_counts.upcoming or 0,
    )


# ── Overdue returns list ───────────────────────────────────────────────────────

def get_overdue_returns(
    db: Session,
    current_user: User,
    limit: int = 50,
    offset: int = 0,
) -> OverdueReturnsResponse:
    now = _now_utc()

    q = (
        db.query(Allocation)
        .options(
            joinedload(Allocation.asset).joinedload(Asset.category),
            joinedload(Allocation.asset).joinedload(Asset.department),
            joinedload(Allocation.allocated_to_user),
            joinedload(Allocation.allocated_to_dept),
        )
        .filter(
            Allocation.status == AllocationStatus.ACTIVE,
            Allocation.expected_return_date.isnot(None),
            Allocation.expected_return_date < now,
        )
        .order_by(Allocation.expected_return_date.asc())  # most overdue first
    )

    if not _is_admin_or_above(current_user.role):
        if current_user.role == UserRole.MANAGER and current_user.department_id:
            q = q.filter(
                Allocation.allocated_to_dept_id == current_user.department_id
            )
        else:
            q = q.filter(Allocation.allocated_to_user_id == current_user.id)

    total = q.count()
    rows = q.offset(offset).limit(limit).all()

    return OverdueReturnsResponse(
        total=total,
        items=[_allocation_to_return_item(a, now) for a in rows],
    )


# ── Upcoming returns list ──────────────────────────────────────────────────────

def get_upcoming_returns(
    db: Session,
    current_user: User,
    days_ahead: int = 7,
    limit: int = 50,
    offset: int = 0,
) -> UpcomingReturnsResponse:
    now = _now_utc()
    cutoff = now + timedelta(days=days_ahead)

    q = (
        db.query(Allocation)
        .options(
            joinedload(Allocation.asset).joinedload(Asset.category),
            joinedload(Allocation.asset).joinedload(Asset.department),
            joinedload(Allocation.allocated_to_user),
            joinedload(Allocation.allocated_to_dept),
        )
        .filter(
            Allocation.status == AllocationStatus.ACTIVE,
            Allocation.expected_return_date.isnot(None),
            Allocation.expected_return_date >= now,
            Allocation.expected_return_date <= cutoff,
        )
        .order_by(Allocation.expected_return_date.asc())
    )

    if not _is_admin_or_above(current_user.role):
        if current_user.role == UserRole.MANAGER and current_user.department_id:
            q = q.filter(
                Allocation.allocated_to_dept_id == current_user.department_id
            )
        else:
            q = q.filter(Allocation.allocated_to_user_id == current_user.id)

    total = q.count()
    rows = q.offset(offset).limit(limit).all()

    return UpcomingReturnsResponse(
        total=total,
        days_ahead=days_ahead,
        items=[_allocation_to_return_item(a, now) for a in rows],
    )


# ── Recent maintenance activity ────────────────────────────────────────────────

def get_maintenance_activity(
    db: Session,
    current_user: User,
    limit: int = 10,
) -> MaintenanceActivityResponse:
    q = (
        db.query(MaintenanceRequest)
        .options(
            joinedload(MaintenanceRequest.asset),
            joinedload(MaintenanceRequest.requested_by),
        )
        .filter(
            MaintenanceRequest.status.notin_([
                MaintenanceStatus.DRAFT,
                MaintenanceStatus.CANCELLED,
            ])
        )
        .order_by(MaintenanceRequest.updated_at.desc())
    )

    if not _is_admin_or_above(current_user.role):
        if current_user.role == UserRole.MANAGER and current_user.department_id:
            q = q.join(Asset).filter(
                Asset.department_id == current_user.department_id
            )
        else:
            q = q.filter(MaintenanceRequest.requested_by_id == current_user.id)

    total = q.count()
    rows = q.limit(limit).all()

    items = [
        MaintenanceActivityItem(
            request_id=r.id,
            asset_tag=r.asset.asset_tag if r.asset else "—",
            asset_name=r.asset.name if r.asset else "—",
            status=r.status.value,
            priority=r.priority.value,
            requested_by=r.requested_by.full_name if r.requested_by else "—",
            submitted_at=r.submitted_at,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return MaintenanceActivityResponse(total=total, items=items)


# ── Active bookings snapshot ───────────────────────────────────────────────────

def get_active_bookings(
    db: Session,
    current_user: User,
    limit: int = 10,
) -> ActiveBookingsResponse:
    now = _now_utc()

    q = (
        db.query(Booking)
        .options(
            joinedload(Booking.asset),
            joinedload(Booking.booked_by),
        )
        .filter(
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
            Booking.end_time >= now,
        )
        .order_by(Booking.start_time.asc())
    )

    if not _is_admin_or_above(current_user.role):
        if current_user.role == UserRole.MANAGER and current_user.department_id:
            q = q.join(Asset).filter(
                Asset.department_id == current_user.department_id
            )
        else:
            q = q.filter(Booking.booked_by_id == current_user.id)

    total = q.count()
    rows = q.limit(limit).all()

    items = [
        ActiveBookingItem(
            booking_id=b.id,
            asset_tag=b.asset.asset_tag if b.asset else "—",
            asset_name=b.asset.name if b.asset else "—",
            booked_by=b.booked_by.full_name if b.booked_by else "—",
            status=b.status.value,
            start_time=b.start_time,
            end_time=b.end_time,
            purpose=b.purpose,
        )
        for b in rows
    ]
    return ActiveBookingsResponse(total=total, items=items)


# ── Private helpers ────────────────────────────────────────────────────────────

def _allocation_to_return_item(alloc: Allocation, now: datetime) -> ReturnItem:
    asset = alloc.asset
    exp = alloc.expected_return_date

    # Make exp timezone-aware for comparison if it is naive
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    days_overdue: int | None = None
    if exp and exp < now:
        days_overdue = (now - exp).days

    if alloc.allocated_to_user:
        allocated_to = alloc.allocated_to_user.full_name
        allocated_to_type = "user"
    elif alloc.allocated_to_dept:
        allocated_to = alloc.allocated_to_dept.name
        allocated_to_type = "department"
    else:
        allocated_to = "—"
        allocated_to_type = "unknown"

    return ReturnItem(
        allocation_id=alloc.id,
        asset_id=asset.id if asset else alloc.asset_id,
        asset_tag=asset.asset_tag if asset else "—",
        asset_name=asset.name if asset else "—",
        allocated_to=allocated_to,
        allocated_to_type=allocated_to_type,
        allocated_at=alloc.allocated_at,
        expected_return_date=exp or alloc.expected_return_date,
        days_overdue=days_overdue,
        department_name=asset.department.name if asset and asset.department else None,
        category_name=asset.category.name if asset and asset.category else None,
    )
