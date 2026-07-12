"""Allocation & Transfer router."""
import uuid
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.allocation import (
    AllocateRequest, AllocationListResponse, AllocationResponse,
    ConflictInfo, ReturnRequest, TransferListResponse,
    TransferRequestCreate, TransferRequestResponse, TransferReview,
)
from app.services import allocation_service

router = APIRouter(prefix="/allocations", tags=["Allocations"])
ManagerUp = Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER))]


@router.get("", response_model=AllocationListResponse)
def list_allocations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: Optional[str] = Query(default=None),
    overdue_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AllocationListResponse:
    return allocation_service.list_allocations(db, current_user, status, overdue_only, limit, offset)


@router.get("/conflict-check", response_model=ConflictInfo)
def check_conflict(
    asset_id: uuid.UUID = Query(...),
    _: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> ConflictInfo:
    return allocation_service.check_conflict(db, asset_id)


@router.post("", response_model=AllocationResponse, status_code=status.HTTP_201_CREATED)
def allocate(
    payload: AllocateRequest,
    current_user: ManagerUp,
    db: Annotated[Session, Depends(get_db)],
) -> AllocationResponse:
    return allocation_service.allocate(db, payload, current_user)


@router.post("/{alloc_id}/return", response_model=AllocationResponse)
def return_asset(
    alloc_id: uuid.UUID,
    payload: ReturnRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AllocationResponse:
    return allocation_service.return_asset(db, alloc_id, payload, current_user)


# ── Transfers ──────────────────────────────────────────────────────────────────

@router.get("/transfers", response_model=TransferListResponse)
def list_transfers(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> TransferListResponse:
    return allocation_service.list_transfers(db, current_user, status, limit, offset)


@router.post("/transfers", response_model=TransferRequestResponse, status_code=status.HTTP_201_CREATED)
def create_transfer(
    payload: TransferRequestCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TransferRequestResponse:
    return allocation_service.create_transfer_request(db, payload, current_user)


@router.post("/transfers/{transfer_id}/review", response_model=TransferRequestResponse)
def review_transfer(
    transfer_id: uuid.UUID,
    payload: TransferReview,
    current_user: ManagerUp,
    db: Annotated[Session, Depends(get_db)],
) -> TransferRequestResponse:
    return allocation_service.review_transfer(db, transfer_id, payload, current_user)
