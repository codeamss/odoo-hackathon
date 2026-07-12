"""Asset Category router."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.asset_category import (
    AssetCategoryCreate,
    AssetCategoryListResponse,
    AssetCategoryResponse,
    AssetCategoryUpdate,
)
from app.schemas.auth import MessageResponse
from app.services import asset_category_service

router = APIRouter(prefix="/asset-categories", tags=["Asset Categories"])


@router.get("", response_model=AssetCategoryListResponse)
def list_categories(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    include_inactive: bool = Query(default=False),
    search: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AssetCategoryListResponse:
    return asset_category_service.list_categories(db, include_inactive, search, limit, offset)


@router.get("/{cat_id}", response_model=AssetCategoryResponse)
def get_category(
    cat_id: uuid.UUID,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AssetCategoryResponse:
    return asset_category_service.get_category(db, cat_id)


@router.post("", response_model=AssetCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: AssetCategoryCreate,
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> AssetCategoryResponse:
    return asset_category_service.create_category(db, payload)


@router.patch("/{cat_id}", response_model=AssetCategoryResponse)
def update_category(
    cat_id: uuid.UUID,
    payload: AssetCategoryUpdate,
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> AssetCategoryResponse:
    return asset_category_service.update_category(db, cat_id, payload)


@router.delete("/{cat_id}", response_model=MessageResponse)
def delete_category(
    cat_id: uuid.UUID,
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    asset_category_service.delete_category(db, cat_id)
    return MessageResponse(message="Category deleted successfully.")
