"""Maintenance service — full workflow engine."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestException, NotFoundException, ForbiddenException
from app.models.asset import Asset, AssetStatusHistory
from app.models.enums import AssetStatus, MaintenanceStatus, UserRole
from app.models.maintenance_request import MaintenanceRequest
from app.models.user import User
from app.schemas.maintenance import (
    AssetBrief, MaintenanceCreate, MaintenanceListResponse,
    MaintenanceResponse, MaintenanceWorkflowAction, UserBrief,
)

def _now(): return datetime.now(timezone.utc)

# Actions allowed per status per role
_ALLOWED: dict[str, dict[str, list[str]]] = {
    "DRAFT":        {"owner": ["submit", "cancel"], "manager": ["submit", "cancel"]},
    "SUBMITTED":    {"manager": ["approve", "reject", "cancel"]},
    "UNDER_REVIEW": {"manager": ["approve", "reject", "cancel"]},
    "APPROVED":     {"manager": ["assign", "cancel"]},
    "IN_PROGRESS":  {"manager": ["complete", "cancel"], "technician": ["complete"]},
    "COMPLETED":    {},
    "REJECTED":     {},
    "CANCELLED":    {},
}

def _allowed_actions(req: MaintenanceRequest, user: User) -> list[str]:
    role_key = ("manager" if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
                else "technician" if req.assigned_to_id == user.id
                else "owner" if req.requested_by_id == user.id else "")
    return _ALLOWED.get(req.status.value, {}).get(role_key, [])

def _to_resp(req: MaintenanceRequest, user: User) -> MaintenanceResponse:
    return MaintenanceResponse(
        id=req.id, asset_id=req.asset_id,
        asset=AssetBrief(id=req.asset.id, asset_tag=req.asset.asset_tag, name=req.asset.name),
        requested_by=UserBrief.model_validate(req.requested_by),
        assigned_to=UserBrief.model_validate(req.assigned_to) if req.assigned_to else None,
        approved_by=UserBrief.model_validate(req.approved_by) if req.approved_by else None,
        status=req.status.value, priority=req.priority.value,
        description=req.description,
        estimated_cost=float(req.estimated_cost) if req.estimated_cost else None,
        actual_cost=float(req.actual_cost) if req.actual_cost else None,
        submitted_at=req.submitted_at, approved_at=req.approved_at,
        completed_at=req.completed_at, created_at=req.created_at, updated_at=req.updated_at,
        allowed_actions=_allowed_actions(req, user),
    )

def _load(db: Session, req_id: uuid.UUID) -> MaintenanceRequest:
    r = db.query(MaintenanceRequest).options(
        joinedload(MaintenanceRequest.asset),
        joinedload(MaintenanceRequest.requested_by),
        joinedload(MaintenanceRequest.assigned_to),
        joinedload(MaintenanceRequest.approved_by),
    ).filter(MaintenanceRequest.id == req_id).first()
    if not r: raise NotFoundException("Maintenance request")
    return r

def list_requests(db: Session, user: User, status_filter: Optional[str] = None,
                  my_only: bool = False, limit: int = 50, offset: int = 0) -> MaintenanceListResponse:
    q = db.query(MaintenanceRequest).options(
        joinedload(MaintenanceRequest.asset),
        joinedload(MaintenanceRequest.requested_by),
        joinedload(MaintenanceRequest.assigned_to),
        joinedload(MaintenanceRequest.approved_by),
    )
    if status_filter: q = q.filter(MaintenanceRequest.status == status_filter)
    if my_only or user.role == UserRole.EMPLOYEE:
        q = q.filter(MaintenanceRequest.requested_by_id == user.id)
    total = q.count()
    items = q.order_by(MaintenanceRequest.updated_at.desc()).offset(offset).limit(limit).all()
    return MaintenanceListResponse(total=total, items=[_to_resp(r, user) for r in items])

def create_request(db: Session, payload: MaintenanceCreate, user: User) -> MaintenanceResponse:
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset: raise NotFoundException("Asset")
    from app.models.enums import MaintenancePriority
    req = MaintenanceRequest(
        id=uuid.uuid4(), asset_id=payload.asset_id,
        requested_by_id=user.id, description=payload.description,
        priority=MaintenancePriority(payload.priority),
        status=MaintenanceStatus.DRAFT,
    )
    db.add(req); db.commit()
    return _to_resp(_load(db, req.id), user)

def perform_action(db: Session, req_id: uuid.UUID,
                   payload: MaintenanceWorkflowAction, user: User) -> MaintenanceResponse:
    req = _load(db, req_id)
    allowed = _allowed_actions(req, user)
    if payload.action not in allowed:
        raise ForbiddenException(
            f"Action '{payload.action}' not allowed on status '{req.status.value}' for your role."
        )

    action = payload.action
    asset = db.query(Asset).filter(Asset.id == req.asset_id).first()

    if action == "submit":
        req.status = MaintenanceStatus.SUBMITTED
        req.submitted_at = _now()

    elif action == "approve":
        req.status = MaintenanceStatus.APPROVED
        req.approved_by_id = user.id
        req.approved_at = _now()
        if payload.estimated_cost: req.estimated_cost = payload.estimated_cost
        # Auto-update asset to UNDER_MAINTENANCE
        if asset and asset.status != AssetStatus.UNDER_MAINTENANCE:
            old = asset.status
            asset.status = AssetStatus.UNDER_MAINTENANCE
            db.add(AssetStatusHistory(
                id=uuid.uuid4(), asset_id=asset.id,
                from_status=old, to_status=AssetStatus.UNDER_MAINTENANCE,
                changed_by_id=user.id, reason=f"Maintenance request approved",
            ))

    elif action == "reject":
        req.status = MaintenanceStatus.REJECTED

    elif action == "assign":
        if not payload.assigned_to_id: raise BadRequestException("assigned_to_id required.")
        tech = db.query(User).filter(User.id == payload.assigned_to_id).first()
        if not tech: raise NotFoundException("Technician user")
        req.assigned_to_id = payload.assigned_to_id
        req.status = MaintenanceStatus.IN_PROGRESS

    elif action == "start":
        req.status = MaintenanceStatus.IN_PROGRESS

    elif action == "complete":
        req.status = MaintenanceStatus.COMPLETED
        req.completed_at = _now()
        if payload.actual_cost: req.actual_cost = payload.actual_cost
        # Auto-update asset back to AVAILABLE
        if asset and asset.status == AssetStatus.UNDER_MAINTENANCE:
            asset.status = AssetStatus.AVAILABLE
            db.add(AssetStatusHistory(
                id=uuid.uuid4(), asset_id=asset.id,
                from_status=AssetStatus.UNDER_MAINTENANCE, to_status=AssetStatus.AVAILABLE,
                changed_by_id=user.id, reason="Maintenance completed",
            ))

    elif action == "cancel":
        req.status = MaintenanceStatus.CANCELLED

    db.commit()
    return _to_resp(_load(db, req_id), user)
