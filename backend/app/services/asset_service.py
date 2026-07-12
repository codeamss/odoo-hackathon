"""Asset service — registration, lifecycle management, history."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.allocation import Allocation
from app.models.asset import Asset, AssetStatusHistory
from app.models.asset_category import AssetCategory
from app.models.department import Department
from app.models.enums import AllocationStatus, AssetStatus
from app.models.maintenance_request import MaintenanceRequest
from app.models.user import User
from app.schemas.asset import (
    AllocationHistoryEntry,
    AssetCreate,
    AssetHistoryResponse,
    AssetListResponse,
    AssetResponse,
    AssetStatusUpdate,
    AssetUpdate,
    CategoryInfo,
    DeptInfo,
    MaintenanceHistoryEntry,
    StatusHistoryEntry,
)

# ── Valid status transitions ───────────────────────────────────────────────────
VALID_TRANSITIONS: dict[AssetStatus, set[AssetStatus]] = {
    AssetStatus.AVAILABLE:          {AssetStatus.ALLOCATED, AssetStatus.RESERVED, AssetStatus.UNDER_MAINTENANCE, AssetStatus.LOST, AssetStatus.RETIRED},
    AssetStatus.ALLOCATED:          {AssetStatus.AVAILABLE, AssetStatus.UNDER_MAINTENANCE, AssetStatus.LOST},
    AssetStatus.RESERVED:           {AssetStatus.AVAILABLE, AssetStatus.ALLOCATED},
    AssetStatus.UNDER_MAINTENANCE:  {AssetStatus.AVAILABLE, AssetStatus.RETIRED},
    AssetStatus.LOST:               set(),
    AssetStatus.RETIRED:            {AssetStatus.DISPOSED},
    AssetStatus.DISPOSED:           set(),
}


def _next_asset_tag(db: Session) -> str:
    """Generate next sequential tag: AF-00001, AF-00002, ..."""
    last = (
        db.query(Asset)
        .order_by(Asset.asset_tag.desc())
        .first()
    )
    if not last:
        return "AF-00001"
    try:
        num = int(last.asset_tag.split("-")[1])
        return f"AF-{(num + 1):05d}"
    except (IndexError, ValueError):
        count = db.query(func.count(Asset.id)).scalar() or 0
        return f"AF-{(count + 1):05d}"


def _to_response(asset: Asset) -> AssetResponse:
    return AssetResponse(
        id=asset.id,
        asset_tag=asset.asset_tag,
        name=asset.name,
        description=asset.description,
        serial_number=asset.serial_number,
        location=asset.location,
        condition=getattr(asset, "condition", None),
        category_id=asset.category_id,
        category=CategoryInfo.model_validate(asset.category) if asset.category else None,
        department_id=asset.department_id,
        department=DeptInfo.model_validate(asset.department) if asset.department else None,
        status=asset.status,
        purchase_date=asset.purchase_date,
        purchase_cost=float(asset.purchase_cost) if asset.purchase_cost is not None else None,
        current_value=float(asset.current_value) if asset.current_value is not None else None,
        warranty_expiry_date=asset.warranty_expiry_date,
        is_bookable=asset.is_bookable,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


def _get_or_404(db: Session, asset_id: uuid.UUID) -> Asset:
    asset = (
        db.query(Asset)
        .options(joinedload(Asset.category), joinedload(Asset.department))
        .filter(Asset.id == asset_id)
        .first()
    )
    if not asset:
        raise NotFoundException("Asset")
    return asset


def list_assets(
    db: Session,
    search: Optional[str] = None,
    status: Optional[AssetStatus] = None,
    category_id: Optional[uuid.UUID] = None,
    department_id: Optional[uuid.UUID] = None,
    location: Optional[str] = None,
    is_bookable: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
) -> AssetListResponse:
    q = db.query(Asset).options(
        joinedload(Asset.category), joinedload(Asset.department)
    )
    if search:
        term = f"%{search}%"
        q = q.filter(
            Asset.name.ilike(term)
            | Asset.asset_tag.ilike(term)
            | Asset.serial_number.ilike(term)
            | Asset.location.ilike(term)
        )
    if status:
        q = q.filter(Asset.status == status)
    if category_id:
        q = q.filter(Asset.category_id == category_id)
    if department_id:
        q = q.filter(Asset.department_id == department_id)
    if location:
        q = q.filter(Asset.location.ilike(f"%{location}%"))
    if is_bookable is not None:
        q = q.filter(Asset.is_bookable == is_bookable)

    total = q.count()
    assets = q.order_by(Asset.asset_tag).offset(offset).limit(limit).all()
    return AssetListResponse(total=total, items=[_to_response(a) for a in assets])


def get_asset(db: Session, asset_id: uuid.UUID) -> AssetResponse:
    return _to_response(_get_or_404(db, asset_id))


def create_asset(db: Session, payload: AssetCreate, created_by: User) -> AssetResponse:
    if payload.serial_number:
        clash = db.query(Asset).filter(Asset.serial_number == payload.serial_number).first()
        if clash:
            raise ConflictException(f"Serial number '{payload.serial_number}' already registered (tag: {clash.asset_tag}).")

    if payload.category_id:
        if not db.query(AssetCategory).filter(AssetCategory.id == payload.category_id).first():
            raise NotFoundException("Asset category")

    if payload.department_id:
        if not db.query(Department).filter(Department.id == payload.department_id).first():
            raise NotFoundException("Department")

    tag = _next_asset_tag(db)

    asset = Asset(
        id=uuid.uuid4(),
        asset_tag=tag,
        name=payload.name,
        description=payload.description,
        serial_number=payload.serial_number,
        location=payload.location,
        category_id=payload.category_id,
        department_id=payload.department_id,
        status=AssetStatus.AVAILABLE,
        purchase_date=payload.purchase_date,
        purchase_cost=payload.purchase_cost,
        current_value=payload.current_value,
        warranty_expiry_date=payload.warranty_expiry_date,
        is_bookable=payload.is_bookable,
    )
    db.add(asset)

    # Record initial status history
    history = AssetStatusHistory(
        id=uuid.uuid4(),
        asset_id=asset.id,
        from_status=None,
        to_status=AssetStatus.AVAILABLE,
        changed_by_id=created_by.id,
        reason="Asset registered",
    )
    db.add(history)
    db.commit()
    db.refresh(asset)
    return _to_response(_get_or_404(db, asset.id))


def update_asset(db: Session, asset_id: uuid.UUID, payload: AssetUpdate) -> AssetResponse:
    asset = _get_or_404(db, asset_id)

    if payload.serial_number is not None:
        clash = (
            db.query(Asset)
            .filter(Asset.serial_number == payload.serial_number, Asset.id != asset_id)
            .first()
        )
        if clash:
            raise ConflictException(f"Serial number already used by asset {clash.asset_tag}.")

    if payload.category_id is not None:
        if not db.query(AssetCategory).filter(AssetCategory.id == payload.category_id).first():
            raise NotFoundException("Asset category")

    if payload.department_id is not None:
        if not db.query(Department).filter(Department.id == payload.department_id).first():
            raise NotFoundException("Department")

    for field in (
        "name", "description", "serial_number", "location", "condition",
        "category_id", "department_id", "purchase_date", "purchase_cost",
        "current_value", "warranty_expiry_date", "is_bookable",
    ):
        val = getattr(payload, field)
        if val is not None:
            setattr(asset, field, val)

    db.commit()
    return _to_response(_get_or_404(db, asset_id))


def update_status(
    db: Session, asset_id: uuid.UUID, payload: AssetStatusUpdate, changed_by: User
) -> AssetResponse:
    asset = _get_or_404(db, asset_id)

    allowed = VALID_TRANSITIONS.get(asset.status, set())
    if payload.status not in allowed:
        raise BadRequestException(
            f"Cannot transition from {asset.status.value} to {payload.status.value}. "
            f"Allowed: {', '.join(s.value for s in allowed) or 'none (terminal state)'}."
        )

    old_status = asset.status
    asset.status = payload.status

    history = AssetStatusHistory(
        id=uuid.uuid4(),
        asset_id=asset.id,
        from_status=old_status,
        to_status=payload.status,
        changed_by_id=changed_by.id,
        reason=payload.reason,
    )
    db.add(history)
    db.commit()
    return _to_response(_get_or_404(db, asset_id))


def get_asset_history(db: Session, asset_id: uuid.UUID) -> AssetHistoryResponse:
    asset = _get_or_404(db, asset_id)

    # Status history
    status_rows = (
        db.query(AssetStatusHistory)
        .options(joinedload(AssetStatusHistory.changed_by))
        .filter(AssetStatusHistory.asset_id == asset_id)
        .order_by(AssetStatusHistory.changed_at.desc())
        .all()
    )
    status_history = [
        StatusHistoryEntry(
            id=r.id,
            from_status=r.from_status,
            to_status=r.to_status,
            changed_by_name=r.changed_by.full_name if r.changed_by else None,
            reason=r.reason,
            changed_at=r.changed_at,
        )
        for r in status_rows
    ]

    # Allocation history
    alloc_rows = (
        db.query(Allocation)
        .options(
            joinedload(Allocation.allocated_to_user),
            joinedload(Allocation.allocated_to_dept),
            joinedload(Allocation.allocated_by),
        )
        .filter(Allocation.asset_id == asset_id)
        .order_by(Allocation.allocated_at.desc())
        .all()
    )
    allocation_history = [
        AllocationHistoryEntry(
            id=a.id,
            allocated_to=a.allocated_to_user.full_name if a.allocated_to_user else (a.allocated_to_dept.name if a.allocated_to_dept else "—"),
            allocated_to_type="user" if a.allocated_to_user else "department",
            allocated_by_name=a.allocated_by.full_name if a.allocated_by else "—",
            status=a.status.value,
            allocated_at=a.allocated_at,
            expected_return_date=a.expected_return_date,
            actual_return_date=a.actual_return_date,
            notes=a.notes,
        )
        for a in alloc_rows
    ]

    # Maintenance history
    maint_rows = (
        db.query(MaintenanceRequest)
        .options(joinedload(MaintenanceRequest.requested_by))
        .filter(MaintenanceRequest.asset_id == asset_id)
        .order_by(MaintenanceRequest.created_at.desc())
        .all()
    )
    maintenance_history = [
        MaintenanceHistoryEntry(
            id=m.id,
            status=m.status.value,
            priority=m.priority.value,
            description=m.description,
            requested_by_name=m.requested_by.full_name if m.requested_by else "—",
            submitted_at=m.submitted_at,
            completed_at=m.completed_at,
            actual_cost=float(m.actual_cost) if m.actual_cost is not None else None,
        )
        for m in maint_rows
    ]

    return AssetHistoryResponse(
        asset_id=asset.id,
        asset_tag=asset.asset_tag,
        status_history=status_history,
        allocation_history=allocation_history,
        maintenance_history=maintenance_history,
    )
