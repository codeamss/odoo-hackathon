"""Asset router."""
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import AssetStatus, UserRole
from app.models.user import User
from app.schemas.asset import (
    AssetCreate,
    AssetHistoryResponse,
    AssetListResponse,
    AssetResponse,
    AssetStatusUpdate,
    AssetUpdate,
)
from app.services import asset_service

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("", response_model=AssetListResponse)
def list_assets(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    search: Optional[str] = Query(default=None),
    status: Optional[AssetStatus] = Query(default=None),
    category_id: Optional[uuid.UUID] = Query(default=None),
    department_id: Optional[uuid.UUID] = Query(default=None),
    location: Optional[str] = Query(default=None),
    is_bookable: Optional[bool] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AssetListResponse:
    return asset_service.list_assets(
        db, search, status, category_id, department_id, location, is_bookable, limit, offset
    )


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: uuid.UUID,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AssetResponse:
    return asset_service.get_asset(db, asset_id)


@router.get("/{asset_id}/history", response_model=AssetHistoryResponse)
def get_history(
    asset_id: uuid.UUID,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AssetHistoryResponse:
    return asset_service.get_asset_history(db, asset_id)


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: AssetCreate,
    current_user: Annotated[
        User,
        Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> AssetResponse:
    return asset_service.create_asset(db, payload, current_user)


@router.patch("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: uuid.UUID,
    payload: AssetUpdate,
    _: Annotated[
        User,
        Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> AssetResponse:
    return asset_service.update_asset(db, asset_id, payload)


@router.patch("/{asset_id}/status", response_model=AssetResponse)
def update_status(
    asset_id: uuid.UUID,
    payload: AssetStatusUpdate,
    current_user: Annotated[
        User,
        Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> AssetResponse:
    """Change asset lifecycle status. Enforces valid transition rules."""
    return asset_service.update_status(db, asset_id, payload, current_user)
