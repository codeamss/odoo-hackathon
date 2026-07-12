"""Notifications + Activity Log router."""
import uuid
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.notification import ActivityLogListResponse, NotificationListResponse
from app.schemas.auth import MessageResponse
from app.services import notification_service

router = APIRouter(tags=["Notifications"])


@router.get("/notifications", response_model=NotificationListResponse)
def get_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> NotificationListResponse:
    return notification_service.get_notifications(db, current_user, unread_only, limit, offset)


@router.post("/notifications/mark-read", response_model=MessageResponse)
def mark_all_read(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    notification_service.mark_read(db, current_user)
    return MessageResponse(message="All notifications marked as read.")


@router.post("/notifications/{notification_id}/mark-read", response_model=MessageResponse)
def mark_one_read(
    notification_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    notification_service.mark_read(db, current_user, notification_id)
    return MessageResponse(message="Notification marked as read.")


@router.get("/activity-logs", response_model=ActivityLogListResponse)
def get_activity_logs(
    current_user: Annotated[User, Depends(require_roles(
        UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.AUDITOR
    ))],
    db: Annotated[Session, Depends(get_db)],
    action: Optional[str] = Query(default=None),
    entity_type: Optional[str] = Query(default=None),
    actor_id: Optional[uuid.UUID] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> ActivityLogListResponse:
    return notification_service.get_activity_logs(db, action, entity_type, actor_id, limit, offset)
