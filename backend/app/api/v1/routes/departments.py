"""Department router — admin/manager access."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentResponse,
    DepartmentUpdate,
)
from app.services import department_service
from pydantic import BaseModel

router = APIRouter(prefix="/departments", tags=["Departments"])

AdminOrManager = Annotated[
    User,
    Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)),
]


class AssignHeadRequest(BaseModel):
    manager_id: uuid.UUID


@router.get("", response_model=DepartmentListResponse)
def list_departments(
    _: AdminOrManager,
    db: Annotated[Session, Depends(get_db)],
    include_inactive: bool = Query(default=False),
    search: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> DepartmentListResponse:
    return department_service.list_departments(db, include_inactive, search, limit, offset)


@router.get("/{dept_id}", response_model=DepartmentResponse)
def get_department(
    dept_id: uuid.UUID,
    _: AdminOrManager,
    db: Annotated[Session, Depends(get_db)],
) -> DepartmentResponse:
    return department_service.get_department(db, dept_id)


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> DepartmentResponse:
    return department_service.create_department(db, payload)


@router.patch("/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: uuid.UUID,
    payload: DepartmentUpdate,
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> DepartmentResponse:
    return department_service.update_department(db, dept_id, payload)


@router.post("/{dept_id}/deactivate", response_model=DepartmentResponse)
def deactivate_department(
    dept_id: uuid.UUID,
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> DepartmentResponse:
    return department_service.deactivate_department(db, dept_id)


@router.post("/{dept_id}/assign-head", response_model=DepartmentResponse)
def assign_head(
    dept_id: uuid.UUID,
    payload: AssignHeadRequest,
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> DepartmentResponse:
    return department_service.assign_head(db, dept_id, payload.manager_id)
