"""Audit router."""
import uuid
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.audit import (
    AuditCycleCreate, AuditCycleListResponse, AuditCycleResponse,
    DiscrepancyReport, FindingResponse, RecordFindingRequest,
)
from app.services import audit_service

router = APIRouter(prefix="/audit", tags=["Audit"])
AdminAuditor = Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.AUDITOR, UserRole.MANAGER))]


@router.get("", response_model=AuditCycleListResponse)
def list_cycles(
    current_user: AdminAuditor, db: Annotated[Session, Depends(get_db)],
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AuditCycleListResponse:
    return audit_service.list_cycles(db, status, limit, offset)


@router.post("", response_model=AuditCycleResponse, status_code=status.HTTP_201_CREATED)
def create_cycle(
    payload: AuditCycleCreate,
    current_user: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> AuditCycleResponse:
    return audit_service.create_cycle(db, payload, current_user)


@router.post("/{cycle_id}/start", response_model=AuditCycleResponse)
def start_cycle(
    cycle_id: uuid.UUID, current_user: AdminAuditor,
    db: Annotated[Session, Depends(get_db)],
) -> AuditCycleResponse:
    return audit_service.start_cycle(db, cycle_id, current_user)


@router.post("/{cycle_id}/findings", response_model=FindingResponse)
def record_finding(
    cycle_id: uuid.UUID, payload: RecordFindingRequest,
    current_user: AdminAuditor, db: Annotated[Session, Depends(get_db)],
) -> FindingResponse:
    return audit_service.record_finding(db, cycle_id, payload, current_user)


@router.post("/{cycle_id}/close", response_model=AuditCycleResponse)
def close_cycle(
    cycle_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> AuditCycleResponse:
    return audit_service.close_cycle(db, cycle_id, current_user)


@router.get("/{cycle_id}/report", response_model=DiscrepancyReport)
def get_report(
    cycle_id: uuid.UUID, current_user: AdminAuditor,
    db: Annotated[Session, Depends(get_db)],
) -> DiscrepancyReport:
    return audit_service.get_discrepancy_report(db, cycle_id)
