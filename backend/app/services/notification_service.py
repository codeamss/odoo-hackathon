"""Notification + ActivityLog service."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.notification import ActivityLog, Notification
from app.models.enums import NotificationType
from app.models.user import User
from app.schemas.notification import (
    ActivityLogListResponse, ActivityLogResponse,
    NotificationListResponse, NotificationResponse,
)


def _now(): return datetime.now(timezone.utc)


# ── Notifications ──────────────────────────────────────────────────────────────

def get_notifications(db: Session, user: User,
                      unread_only: bool = False, limit: int = 50, offset: int = 0) -> NotificationListResponse:
    q = db.query(Notification).filter(Notification.recipient_id == user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    total = q.count()
    unread = db.query(Notification).filter(Notification.recipient_id == user.id, Notification.is_read == False).count()
    items = q.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
    return NotificationListResponse(
        total=total, unread_count=unread,
        items=[NotificationResponse(
            id=n.id, type=n.type.value, title=n.title, body=n.body,
            is_read=n.is_read, reference_type=n.reference_type,
            reference_id=n.reference_id, created_at=n.created_at,
        ) for n in items],
    )


def mark_read(db: Session, user: User, notification_id: Optional[uuid.UUID] = None) -> dict:
    """Mark one or all notifications as read."""
    q = db.query(Notification).filter(Notification.recipient_id == user.id)
    if notification_id:
        q = q.filter(Notification.id == notification_id)
    q.update({"is_read": True})
    db.commit()
    return {"message": "Marked as read."}


def create_notification(db: Session, recipient_id: uuid.UUID, type: NotificationType,
                        title: str, body: str, reference_type: Optional[str] = None,
                        reference_id: Optional[uuid.UUID] = None) -> None:
    """Helper called by other services to push notifications."""
    db.add(Notification(
        id=uuid.uuid4(), recipient_id=recipient_id, type=type,
        title=title, body=body, reference_type=reference_type, reference_id=reference_id,
    ))
    # No commit here — caller commits


# ── Activity Logs ──────────────────────────────────────────────────────────────

def log_activity(db: Session, actor_id: Optional[uuid.UUID], action: str,
                 description: str, entity_type: Optional[str] = None,
                 entity_id: Optional[uuid.UUID] = None, ip_address: Optional[str] = None) -> None:
    db.add(ActivityLog(
        id=uuid.uuid4(), actor_id=actor_id, action=action,
        entity_type=entity_type, entity_id=entity_id,
        description=description, ip_address=ip_address,
    ))


def get_activity_logs(db: Session, action_filter: Optional[str] = None,
                      entity_type: Optional[str] = None,
                      actor_id: Optional[uuid.UUID] = None,
                      limit: int = 100, offset: int = 0) -> ActivityLogListResponse:
    q = db.query(ActivityLog).options(joinedload(ActivityLog.actor))
    if action_filter:
        q = q.filter(ActivityLog.action.ilike(f"%{action_filter}%"))
    if entity_type:
        q = q.filter(ActivityLog.entity_type == entity_type)
    if actor_id:
        q = q.filter(ActivityLog.actor_id == actor_id)
    total = q.count()
    items = q.order_by(ActivityLog.created_at.desc()).offset(offset).limit(limit).all()
    return ActivityLogListResponse(
        total=total,
        items=[ActivityLogResponse(
            id=l.id,
            actor_name=l.actor.full_name if l.actor else "System",
            actor_email=l.actor.email if l.actor else None,
            action=l.action, entity_type=l.entity_type, entity_id=l.entity_id,
            description=l.description, created_at=l.created_at,
        ) for l in items],
    )
