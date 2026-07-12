"""Employee Directory router."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import (
    UpdateRoleRequest,
    UpdateUserRequest,
    UserListResponse,
    UserResponse,
)
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])

AdminOnly = Annotated[
    User,
    Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
]


@router.get("", response_model=UserListResponse)
def list_users(
    current_user: AdminOnly,
    db: Annotated[Session, Depends(get_db)],
    role: UserRole | None = Query(default=None),
    department_id: uuid.UUID | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> UserListResponse:
    return user_service.list_users(
        db, role, department_id, include_inactive, search, limit, offset
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: uuid.UUID,
    _: AdminOnly,
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    return user_service.get_user(db, user_id)


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_role(
    user_id: uuid.UUID,
    payload: UpdateRoleRequest,
    current_user: AdminOnly,
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    """
    The ONLY endpoint where roles are assigned.
    Admins can promote Employees to Manager, Auditor, or Viewer.
    """
    return user_service.update_role(db, user_id, payload, current_user)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: uuid.UUID,
    payload: UpdateUserRequest,
    current_user: AdminOnly,
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    return user_service.update_user(db, user_id, payload, current_user)
