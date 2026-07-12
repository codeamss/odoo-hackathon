"""Maintenance router."""
import uuid
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.maintenance import (
    MaintenanceCreate, MaintenanceListResponse,
    MaintenanceResponse, MaintenanceWorkflowAction,
)
from app.services import maintenance_service

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.get("", response_model=MaintenanceListResponse)
def list_requests(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: Optional[str] = Query(default=None),
    my_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> MaintenanceListResponse:
    return maintenance_service.list_requests(db, current_user, status, my_only, limit, offset)


@router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: MaintenanceCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MaintenanceResponse:
    return maintenance_service.create_request(db, payload, current_user)


@router.post("/{req_id}/action", response_model=MaintenanceResponse)
def perform_action(
    req_id: uuid.UUID,
    payload: MaintenanceWorkflowAction,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MaintenanceResponse:
    return maintenance_service.perform_action(db, req_id, payload, current_user)
