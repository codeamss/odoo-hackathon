"""Schemas for Allocation, Return, Transfer endpoints."""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AllocateRequest(BaseModel):
    asset_id: uuid.UUID
    allocated_to_user_id: Optional[uuid.UUID] = None
    allocated_to_dept_id: Optional[uuid.UUID] = None
    expected_return_date: Optional[datetime] = None
    notes: Optional[str] = None


class ReturnRequest(BaseModel):
    condition_notes: Optional[str] = None


class TransferRequestCreate(BaseModel):
    asset_id: uuid.UUID
    requested_for_user_id: Optional[uuid.UUID] = None
    requested_for_dept_id: Optional[uuid.UUID] = None
    reason: Optional[str] = None
    expected_return_date: Optional[datetime] = None


class TransferReview(BaseModel):
    approved: bool
    review_notes: Optional[str] = None


class AssetInfoBrief(BaseModel):
    id: uuid.UUID
    asset_tag: str
    name: str
    status: str
    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    model_config = {"from_attributes": True}


class DeptBrief(BaseModel):
    id: uuid.UUID
    name: str
    model_config = {"from_attributes": True}


class AllocationResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset: AssetInfoBrief
    allocated_to_user_id: Optional[uuid.UUID]
    allocated_to_user: Optional[UserBrief]
    allocated_to_dept_id: Optional[uuid.UUID]
    allocated_to_dept: Optional[DeptBrief]
    allocated_by_id: uuid.UUID
    allocated_by: UserBrief
    status: str
    allocated_at: datetime
    expected_return_date: Optional[datetime]
    actual_return_date: Optional[datetime]
    notes: Optional[str]
    is_overdue: bool
    model_config = {"from_attributes": True}


class AllocationListResponse(BaseModel):
    total: int
    items: list[AllocationResponse]


class ConflictInfo(BaseModel):
    """Returned when an asset is already allocated."""
    is_conflict: bool
    current_holder: Optional[str]   # name of user or dept
    allocation_id: Optional[uuid.UUID]
    allocated_at: Optional[datetime]


class TransferRequestResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset: AssetInfoBrief
    requested_by: UserBrief
    requested_for_user: Optional[UserBrief]
    requested_for_dept: Optional[DeptBrief]
    reviewed_by: Optional[UserBrief]
    status: str
    reason: Optional[str]
    review_notes: Optional[str]
    expected_return_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class TransferListResponse(BaseModel):
    total: int
    items: list[TransferRequestResponse]
