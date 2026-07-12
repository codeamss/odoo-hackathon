"""Allocation service — allocate, return, conflict check, transfer workflow."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException, ForbiddenException
from app.models.allocation import Allocation
from app.models.asset import Asset, AssetStatusHistory
from app.models.enums import AllocationStatus, AssetStatus, UserRole
from app.models.transfer_request import TransferRequest, TransferStatus
from app.models.user import User
from app.models.department import Department
from app.schemas.allocation import (
    AllocateRequest, AllocationListResponse, AllocationResponse,
    AssetInfoBrief, ConflictInfo, DeptBrief, ReturnRequest,
    TransferListResponse, TransferRequestCreate, TransferRequestResponse,
    TransferReview, UserBrief,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _alloc_response(a: Allocation) -> AllocationResponse:
    exp = _make_aware(a.expected_return_date)
    overdue = bool(a.status == AllocationStatus.ACTIVE and exp and exp < _now())
    return AllocationResponse(
        id=a.id,
        asset_id=a.asset_id,
        asset=AssetInfoBrief(id=a.asset.id, asset_tag=a.asset.asset_tag, name=a.asset.name, status=a.asset.status.value),
        allocated_to_user_id=a.allocated_to_user_id,
        allocated_to_user=UserBrief.model_validate(a.allocated_to_user) if a.allocated_to_user else None,
        allocated_to_dept_id=a.allocated_to_dept_id,
        allocated_to_dept=DeptBrief.model_validate(a.allocated_to_dept) if a.allocated_to_dept else None,
        allocated_by_id=a.allocated_by_id,
        allocated_by=UserBrief.model_validate(a.allocated_by),
        status=a.status.value,
        allocated_at=a.allocated_at,
        expected_return_date=exp,
        actual_return_date=_make_aware(a.actual_return_date),
        notes=a.notes,
        is_overdue=overdue,
    )


def _transfer_response(t: TransferRequest) -> TransferRequestResponse:
    return TransferRequestResponse(
        id=t.id,
        asset_id=t.asset_id,
        asset=AssetInfoBrief(id=t.asset.id, asset_tag=t.asset.asset_tag, name=t.asset.name, status=t.asset.status.value),
        requested_by=UserBrief.model_validate(t.requested_by),
        requested_for_user=UserBrief.model_validate(t.requested_for_user) if t.requested_for_user else None,
        requested_for_dept=DeptBrief.model_validate(t.requested_for_dept) if t.requested_for_dept else None,
        reviewed_by=UserBrief.model_validate(t.reviewed_by) if t.reviewed_by else None,
        status=t.status.value,
        reason=t.reason,
        review_notes=t.review_notes,
        expected_return_date=_make_aware(t.expected_return_date),
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


def _load_alloc(db: Session, alloc_id: uuid.UUID) -> Allocation:
    a = db.query(Allocation).options(
        joinedload(Allocation.asset),
        joinedload(Allocation.allocated_to_user),
        joinedload(Allocation.allocated_to_dept),
        joinedload(Allocation.allocated_by),
    ).filter(Allocation.id == alloc_id).first()
    if not a:
        raise NotFoundException("Allocation")
    return a


def _load_asset(db: Session, asset_id: uuid.UUID) -> Asset:
    a = db.query(Asset).filter(Asset.id == asset_id).first()
    if not a:
        raise NotFoundException("Asset")
    return a


# ── Check conflict ─────────────────────────────────────────────────────────────

def check_conflict(db: Session, asset_id: uuid.UUID) -> ConflictInfo:
    active = db.query(Allocation).options(
        joinedload(Allocation.allocated_to_user),
        joinedload(Allocation.allocated_to_dept),
    ).filter(Allocation.asset_id == asset_id, Allocation.status == AllocationStatus.ACTIVE).first()

    if not active:
        return ConflictInfo(is_conflict=False, current_holder=None, allocation_id=None, allocated_at=None)

    holder = (active.allocated_to_user.full_name if active.allocated_to_user
              else (active.allocated_to_dept.name if active.allocated_to_dept else "Unknown"))
    return ConflictInfo(is_conflict=True, current_holder=holder, allocation_id=active.id, allocated_at=active.allocated_at)


# ── List allocations ───────────────────────────────────────────────────────────

def list_allocations(db: Session, user: User, status_filter: Optional[str] = None,
                     overdue_only: bool = False, limit: int = 50, offset: int = 0) -> AllocationListResponse:
    q = db.query(Allocation).options(
        joinedload(Allocation.asset),
        joinedload(Allocation.allocated_to_user),
        joinedload(Allocation.allocated_to_dept),
        joinedload(Allocation.allocated_by),
    )
    if status_filter:
        q = q.filter(Allocation.status == status_filter)
    else:
        q = q.filter(Allocation.status == AllocationStatus.ACTIVE)

    if user.role == UserRole.EMPLOYEE:
        q = q.filter(Allocation.allocated_to_user_id == user.id)
    elif user.role == UserRole.MANAGER and user.department_id:
        q = q.filter(Allocation.allocated_to_dept_id == user.department_id)

    if overdue_only:
        q = q.filter(Allocation.expected_return_date < _now())

    total = q.count()
    items = q.order_by(Allocation.allocated_at.desc()).offset(offset).limit(limit).all()
    return AllocationListResponse(total=total, items=[_alloc_response(a) for a in items])


# ── Allocate ───────────────────────────────────────────────────────────────────

def allocate(db: Session, payload: AllocateRequest, by_user: User) -> AllocationResponse:
    if not payload.allocated_to_user_id and not payload.allocated_to_dept_id:
        raise BadRequestException("Must specify allocated_to_user_id or allocated_to_dept_id.")

    asset = _load_asset(db, payload.asset_id)

    if asset.status not in (AssetStatus.AVAILABLE, AssetStatus.RESERVED):
        raise ConflictException(
            f"Asset {asset.asset_tag} is {asset.status.value} and cannot be allocated. "
            "Check for an active allocation first."
        )

    # Double-allocation guard
    existing = db.query(Allocation).filter(
        Allocation.asset_id == payload.asset_id,
        Allocation.status == AllocationStatus.ACTIVE,
    ).first()
    if existing:
        raise ConflictException(
            f"Asset {asset.asset_tag} is already allocated. Use the Transfer Request flow."
        )

    alloc = Allocation(
        id=uuid.uuid4(),
        asset_id=payload.asset_id,
        allocated_to_user_id=payload.allocated_to_user_id,
        allocated_to_dept_id=payload.allocated_to_dept_id,
        allocated_by_id=by_user.id,
        status=AllocationStatus.ACTIVE,
        expected_return_date=payload.expected_return_date,
        notes=payload.notes,
    )
    db.add(alloc)

    asset.status = AssetStatus.ALLOCATED
    db.add(AssetStatusHistory(
        id=uuid.uuid4(), asset_id=asset.id,
        from_status=AssetStatus.AVAILABLE, to_status=AssetStatus.ALLOCATED,
        changed_by_id=by_user.id, reason="Asset allocated",
    ))
    db.commit()
    return _alloc_response(_load_alloc(db, alloc.id))


# ── Return ─────────────────────────────────────────────────────────────────────

def return_asset(db: Session, alloc_id: uuid.UUID, payload: ReturnRequest, by_user: User) -> AllocationResponse:
    alloc = _load_alloc(db, alloc_id)

    if alloc.status != AllocationStatus.ACTIVE:
        raise BadRequestException("Allocation is not active.")

    alloc.status = AllocationStatus.RETURNED
    alloc.actual_return_date = _now()
    if payload.condition_notes:
        alloc.notes = (alloc.notes or "") + f"\n[Return notes: {payload.condition_notes}]"

    asset = alloc.asset
    asset.status = AssetStatus.AVAILABLE
    db.add(AssetStatusHistory(
        id=uuid.uuid4(), asset_id=asset.id,
        from_status=AssetStatus.ALLOCATED, to_status=AssetStatus.AVAILABLE,
        changed_by_id=by_user.id, reason=f"Asset returned. {payload.condition_notes or ''}".strip(),
    ))
    db.commit()
    return _alloc_response(_load_alloc(db, alloc_id))


# ── Transfer request ───────────────────────────────────────────────────────────

def create_transfer_request(db: Session, payload: TransferRequestCreate, by_user: User) -> TransferRequestResponse:
    if not payload.requested_for_user_id and not payload.requested_for_dept_id:
        raise BadRequestException("Must specify requested_for_user_id or requested_for_dept_id.")

    asset = _load_asset(db, payload.asset_id)

    active_alloc = db.query(Allocation).filter(
        Allocation.asset_id == payload.asset_id,
        Allocation.status == AllocationStatus.ACTIVE,
    ).first()

    tr = TransferRequest(
        id=uuid.uuid4(),
        asset_id=payload.asset_id,
        from_allocation_id=active_alloc.id if active_alloc else None,
        requested_by_id=by_user.id,
        requested_for_user_id=payload.requested_for_user_id,
        requested_for_dept_id=payload.requested_for_dept_id,
        reason=payload.reason,
        expected_return_date=payload.expected_return_date,
        status=TransferStatus.PENDING,
    )
    db.add(tr)
    db.commit()
    db.refresh(tr)
    return _load_and_respond_transfer(db, tr.id)


def review_transfer(db: Session, transfer_id: uuid.UUID, payload: TransferReview, by_user: User) -> TransferRequestResponse:
    tr = db.query(TransferRequest).options(
        joinedload(TransferRequest.asset),
        joinedload(TransferRequest.requested_by),
        joinedload(TransferRequest.requested_for_user),
        joinedload(TransferRequest.requested_for_dept),
        joinedload(TransferRequest.reviewed_by),
    ).filter(TransferRequest.id == transfer_id).first()
    if not tr:
        raise NotFoundException("Transfer request")
    if tr.status != TransferStatus.PENDING:
        raise BadRequestException(f"Transfer is already {tr.status.value}.")

    tr.reviewed_by_id = by_user.id
    tr.review_notes = payload.review_notes

    if payload.approved:
        tr.status = TransferStatus.APPROVED
        # Execute the transfer: return old allocation, create new one
        if tr.from_allocation_id:
            old_alloc = db.query(Allocation).filter(Allocation.id == tr.from_allocation_id).first()
            if old_alloc and old_alloc.status == AllocationStatus.ACTIVE:
                old_alloc.status = AllocationStatus.RETURNED
                old_alloc.actual_return_date = _now()

        new_alloc = Allocation(
            id=uuid.uuid4(),
            asset_id=tr.asset_id,
            allocated_to_user_id=tr.requested_for_user_id,
            allocated_to_dept_id=tr.requested_for_dept_id,
            allocated_by_id=by_user.id,
            status=AllocationStatus.ACTIVE,
            expected_return_date=tr.expected_return_date,
            notes=f"Transferred via request {tr.id}",
        )
        db.add(new_alloc)
        tr.status = TransferStatus.COMPLETED

        asset = db.query(Asset).filter(Asset.id == tr.asset_id).first()
        if asset:
            db.add(AssetStatusHistory(
                id=uuid.uuid4(), asset_id=asset.id,
                from_status=asset.status, to_status=AssetStatus.ALLOCATED,
                changed_by_id=by_user.id, reason="Transfer approved and executed",
            ))
            asset.status = AssetStatus.ALLOCATED
    else:
        tr.status = TransferStatus.REJECTED

    db.commit()
    return _load_and_respond_transfer(db, transfer_id)


def list_transfers(db: Session, user: User, status_filter: Optional[str] = None,
                   limit: int = 50, offset: int = 0) -> TransferListResponse:
    q = db.query(TransferRequest).options(
        joinedload(TransferRequest.asset),
        joinedload(TransferRequest.requested_by),
        joinedload(TransferRequest.requested_for_user),
        joinedload(TransferRequest.requested_for_dept),
        joinedload(TransferRequest.reviewed_by),
    )
    if status_filter:
        q = q.filter(TransferRequest.status == status_filter)
    if user.role == UserRole.EMPLOYEE:
        q = q.filter(TransferRequest.requested_by_id == user.id)
    if status_filter is None:
        q = q.filter(TransferRequest.status == TransferStatus.PENDING)

    total = q.count()
    items = q.order_by(TransferRequest.created_at.desc()).offset(offset).limit(limit).all()
    return TransferListResponse(total=total, items=[_transfer_response(t) for t in items])


def _load_and_respond_transfer(db: Session, transfer_id: uuid.UUID) -> TransferRequestResponse:
    t = db.query(TransferRequest).options(
        joinedload(TransferRequest.asset),
        joinedload(TransferRequest.requested_by),
        joinedload(TransferRequest.requested_for_user),
        joinedload(TransferRequest.requested_for_dept),
        joinedload(TransferRequest.reviewed_by),
    ).filter(TransferRequest.id == transfer_id).first()
    return _transfer_response(t)
