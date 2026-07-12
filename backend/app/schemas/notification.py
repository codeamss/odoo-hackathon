"""Notification + ActivityLog schemas."""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: uuid.UUID; type: str; title: str; body: str
    is_read: bool; reference_type: Optional[str]; reference_id: Optional[uuid.UUID]
    created_at: datetime
    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    total: int; unread_count: int; items: list[NotificationResponse]


class ActivityLogResponse(BaseModel):
    id: uuid.UUID; actor_name: Optional[str]; actor_email: Optional[str]
    action: str; entity_type: Optional[str]; entity_id: Optional[uuid.UUID]
    description: str; created_at: datetime
    model_config = {"from_attributes": True}


class ActivityLogListResponse(BaseModel):
    total: int; items: list[ActivityLogResponse]
