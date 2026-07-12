"""Maintenance schemas."""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class MaintenanceCreate(BaseModel):
    asset_id: uuid.UUID
    description: str = Field(..., min_length=5)
    priority: str = "MEDIUM"  # LOW|MEDIUM|HIGH|CRITICAL


class MaintenanceWorkflowAction(BaseModel):
    """Single endpoint drives all workflow transitions."""
    action: str  # submit|approve|reject|assign|start|complete|cancel
    assigned_to_id: Optional[uuid.UUID] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    notes: Optional[str] = None


class AssetBrief(BaseModel):
    id: uuid.UUID; asset_tag: str; name: str
    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: uuid.UUID; full_name: str; email: str
    model_config = {"from_attributes": True}


class MaintenanceResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset: AssetBrief
    requested_by: UserBrief
    assigned_to: Optional[UserBrief]
    approved_by: Optional[UserBrief]
    status: str
    priority: str
    description: str
    estimated_cost: Optional[float]
    actual_cost: Optional[float]
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    allowed_actions: list[str]
    model_config = {"from_attributes": True}


class MaintenanceListResponse(BaseModel):
    total: int
    items: list[MaintenanceResponse]
