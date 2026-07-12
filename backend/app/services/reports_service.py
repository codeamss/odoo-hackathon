"""Reports & Analytics service — all aggregation queries."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, case, distinct, extract
from sqlalchemy.orm import Session, joinedload

from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.models.booking import Booking
from app.models.department import Department
from app.models.enums import AllocationStatus, AssetStatus, BookingStatus, MaintenanceStatus
from app.models.maintenance_request import MaintenanceRequest
from app.schemas.reports import (
    AssetDueItem, AssetUtilizationItem, AssetUtilizationResponse,
    BookingHeatmapSlot, DeptAllocationItem,
    MaintenanceFrequencyItem, MaintenanceFrequencyResponse, ReportsSummary,
)


def _now(): return datetime.now(timezone.utc)


# ── Asset Utilization ─────────────────────────────────────────────────────────

def get_utilization(db: Session, top_n: int = 10) -> AssetUtilizationResponse:
    rows = (
        db.query(
            Asset.id, Asset.asset_tag, Asset.name, Asset.status,
            AssetCategory.name.label("cat"),
            Department.name.label("dept"),
            func.count(Allocation.id).label("alloc_count"),
            func.coalesce(
                func.sum(
                    func.extract("epoch",
                        func.coalesce(Allocation.actual_return_date, func.now())
                        - Allocation.allocated_at
                    ) / 86400
                ), 0
            ).label("days"),
        )
        .outerjoin(Allocation, Allocation.asset_id == Asset.id)
        .outerjoin(AssetCategory, AssetCategory.id == Asset.category_id)
        .outerjoin(Department, Department.id == Asset.department_id)
        .group_by(Asset.id, Asset.asset_tag, Asset.name, Asset.status,
                  AssetCategory.name, Department.name)
        .order_by(func.count(Allocation.id).desc())
        .all()
    )

    def _make(r) -> AssetUtilizationItem:
        return AssetUtilizationItem(
            asset_id=str(r.id), asset_tag=r.asset_tag, asset_name=r.name,
            category=r.cat, department=r.dept,
            allocation_count=int(r.alloc_count or 0),
            total_days_allocated=round(float(r.days or 0), 1),
            status=r.status.value,
        )

    most_used = [_make(r) for r in rows if (r.alloc_count or 0) > 0][:top_n]
    idle = [_make(r) for r in rows if (r.alloc_count or 0) == 0][:top_n]
    return AssetUtilizationResponse(most_used=most_used, idle=idle)


# ── Maintenance Frequency ─────────────────────────────────────────────────────

def get_maintenance_frequency(db: Session, top_n: int = 10) -> MaintenanceFrequencyResponse:
    by_asset_rows = (
        db.query(
            Asset.id, Asset.asset_tag, Asset.name,
            AssetCategory.name.label("cat"),
            func.count(MaintenanceRequest.id).label("total"),
            func.count(
                case((MaintenanceRequest.status == MaintenanceStatus.COMPLETED, 1))
            ).label("completed"),
            func.avg(MaintenanceRequest.actual_cost).label("avg_cost"),
        )
        .join(MaintenanceRequest, MaintenanceRequest.asset_id == Asset.id)
        .outerjoin(AssetCategory, AssetCategory.id == Asset.category_id)
        .group_by(Asset.id, Asset.asset_tag, Asset.name, AssetCategory.name)
        .order_by(func.count(MaintenanceRequest.id).desc())
        .limit(top_n)
        .all()
    )

    by_cat_rows = (
        db.query(
            AssetCategory.id, AssetCategory.name.label("cat"),
            func.count(MaintenanceRequest.id).label("total"),
            func.count(
                case((MaintenanceRequest.status == MaintenanceStatus.COMPLETED, 1))
            ).label("completed"),
            func.avg(MaintenanceRequest.actual_cost).label("avg_cost"),
        )
        .join(Asset, Asset.id == MaintenanceRequest.asset_id)
        .join(AssetCategory, AssetCategory.id == Asset.category_id)
        .group_by(AssetCategory.id, AssetCategory.name)
        .order_by(func.count(MaintenanceRequest.id).desc())
        .limit(top_n)
        .all()
    )

    return MaintenanceFrequencyResponse(
        by_asset=[
            MaintenanceFrequencyItem(
                asset_id=str(r.id), asset_tag=r.asset_tag, asset_name=r.name,
                category=r.cat, total_requests=int(r.total),
                completed=int(r.completed),
                avg_cost=round(float(r.avg_cost), 2) if r.avg_cost else None,
            ) for r in by_asset_rows
        ],
        by_category=[
            MaintenanceFrequencyItem(
                asset_id=None, asset_tag=None, asset_name=None,
                category=r.cat, total_requests=int(r.total),
                completed=int(r.completed),
                avg_cost=round(float(r.avg_cost), 2) if r.avg_cost else None,
            ) for r in by_cat_rows
        ],
    )


# ── Assets Due ────────────────────────────────────────────────────────────────

def get_assets_due(db: Session, days_ahead: int = 90) -> list[AssetDueItem]:
    now = _now()
    cutoff = now + timedelta(days=days_ahead)
    results: list[AssetDueItem] = []

    assets = (
        db.query(Asset)
        .options(joinedload(Asset.category), joinedload(Asset.department))
        .filter(Asset.status.notin_([AssetStatus.DISPOSED, AssetStatus.LOST]))
        .all()
    )

    for a in assets:
        cat = a.category.name if a.category else None
        dept = a.department.name if a.department else None

        # Warranty expiry
        if a.warranty_expiry_date:
            exp = datetime(a.warranty_expiry_date.year, a.warranty_expiry_date.month,
                           a.warranty_expiry_date.day, tzinfo=timezone.utc)
            if now <= exp <= cutoff:
                delta = (exp - now).days
                results.append(AssetDueItem(
                    asset_id=str(a.id), asset_tag=a.asset_tag, asset_name=a.name,
                    category=cat, department=dept,
                    due_type="warranty_expiry", due_date=str(a.warranty_expiry_date),
                    days_until_due=delta, status=a.status.value,
                ))

        # Near retirement (AVAILABLE assets older than useful_life_years)
        if a.purchase_date and a.category and a.category.useful_life_years:
            retire_date = datetime(
                a.purchase_date.year + a.category.useful_life_years,
                a.purchase_date.month, a.purchase_date.day, tzinfo=timezone.utc,
            )
            if now <= retire_date <= cutoff:
                results.append(AssetDueItem(
                    asset_id=str(a.id), asset_tag=a.asset_tag, asset_name=a.name,
                    category=cat, department=dept,
                    due_type="retirement", due_date=str(retire_date.date()),
                    days_until_due=(retire_date - now).days, status=a.status.value,
                ))

    return sorted(results, key=lambda x: x.days_until_due or 9999)


# ── Department Allocation Summary ─────────────────────────────────────────────

def get_dept_allocation_summary(db: Session) -> list[DeptAllocationItem]:
    now = _now()

    rows = (
        db.query(
            Department.id, Department.name,
            func.count(Allocation.id).label("total"),
            func.count(
                case((Allocation.status == AllocationStatus.ACTIVE, 1))
            ).label("active"),
            func.count(
                case((
                    (Allocation.status == AllocationStatus.ACTIVE) &
                    (Allocation.expected_return_date < now), 1
                ))
            ).label("overdue"),
            func.count(distinct(Allocation.asset_id)).label("unique_assets"),
        )
        .outerjoin(Allocation, Allocation.allocated_to_dept_id == Department.id)
        .group_by(Department.id, Department.name)
        .order_by(func.count(Allocation.id).desc())
        .all()
    )

    items = [
        DeptAllocationItem(
            department_id=str(r.id), department_name=r.name,
            total_allocations=int(r.total or 0),
            active_allocations=int(r.active or 0),
            overdue_allocations=int(r.overdue or 0),
            unique_assets=int(r.unique_assets or 0),
        ) for r in rows
    ]

    # Add unassigned (user allocations without dept)
    unassigned_total = (
        db.query(func.count(Allocation.id))
        .filter(Allocation.allocated_to_dept_id.is_(None))
        .scalar() or 0
    )
    if unassigned_total:
        items.append(DeptAllocationItem(
            department_id=None, department_name="(Individual / No Department)",
            total_allocations=unassigned_total,
            active_allocations=db.query(func.count(Allocation.id)).filter(
                Allocation.allocated_to_dept_id.is_(None),
                Allocation.status == AllocationStatus.ACTIVE,
            ).scalar() or 0,
            overdue_allocations=0, unique_assets=0,
        ))

    return items


# ── Booking Heatmap ───────────────────────────────────────────────────────────

def get_booking_heatmap(db: Session) -> list[BookingHeatmapSlot]:
    rows = (
        db.query(
            extract("hour", Booking.start_time).label("hr"),
            extract("dow", Booking.start_time).label("dow"),  # 0=Sun in postgres
            func.count(Booking.id).label("cnt"),
        )
        .filter(Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED]))
        .group_by("hr", "dow")
        .all()
    )

    # Postgres dow: 0=Sun → convert to 0=Mon
    result = []
    for r in rows:
        dow_pg = int(r.dow)
        dow_mon = (dow_pg - 1) % 7
        result.append(BookingHeatmapSlot(hour=int(r.hr), day_of_week=dow_mon, booking_count=int(r.cnt)))
    return result


# ── Full summary (single call) ────────────────────────────────────────────────

def get_full_summary(db: Session) -> ReportsSummary:
    return ReportsSummary(
        utilization=get_utilization(db),
        maintenance_frequency=get_maintenance_frequency(db),
        assets_due=get_assets_due(db),
        dept_allocation=get_dept_allocation_summary(db),
        booking_heatmap=get_booking_heatmap(db),
    )
