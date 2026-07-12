"""Pydantic schemas for Asset endpoints."""
import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.enums import AssetStatus


class AssetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    serial_number: Optional[str] = Field(default=None, max_length=255)
    location: Optional[str] = Field(default=None, max_length=255)
    purchase_date: Optional[date] = None
    purchase_cost: Optional[float] = Field(default=None, ge=0)
    current_value: Optional[float] = Field(default=None, ge=0)
    warranty_expiry_date: Optional[date] = None
    is_bookable: bool = False
    condition: Optional[str] = Field(default=None, max_length=100)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class AssetUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    serial_number: Optional[str] = Field(default=None, max_length=255)
    location: Optional[str] = Field(default=None, max_length=255)
    purchase_date: Optional[date] = None
    purchase_cost: Optional[float] = Field(default=None, ge=0)
    current_value: Optional[float] = Field(default=None, ge=0)
    warranty_expiry_date: Optional[date] = None
    is_bookable: Optional[bool] = None
    condition: Optional[str] = Field(default=None, max_length=100)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v


class AssetStatusUpdate(BaseModel):
    status: AssetStatus
    reason: Optional[str] = None


class CategoryInfo(BaseModel):
    id: uuid.UUID
    name: str
    model_config = {"from_attributes": True}


class DeptInfo(BaseModel):
    id: uuid.UUID
    name: str
    model_config = {"from_attributes": True}


class AssetResponse(BaseModel):
    id: uuid.UUID
    asset_tag: str
    name: str
    description: Optional[str]
    serial_number: Optional[str]
    location: Optional[str]
    condition: Optional[str]
    category_id: Optional[uuid.UUID]
    category: Optional[CategoryInfo]
    department_id: Optional[uuid.UUID]
    department: Optional[DeptInfo]
    status: AssetStatus
    purchase_date: Optional[date]
    purchase_cost: Optional[float]
    current_value: Optional[float]
    warranty_expiry_date: Optional[date]
    is_bookable: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class AssetListResponse(BaseModel):
    total: int
    items: list[AssetResponse]


class StatusHistoryEntry(BaseModel):
    id: uuid.UUID
    from_status: Optional[AssetStatus]
    to_status: AssetStatus
    changed_by_name: Optional[str]
    reason: Optional[str]
    changed_at: datetime


class AllocationHistoryEntry(BaseModel):
    id: uuid.UUID
    allocated_to: str
    allocated_to_type: str
    allocated_by_name: str
    status: str
    allocated_at: datetime
    expected_return_date: Optional[datetime]
    actual_return_date: Optional[datetime]
    notes: Optional[str]


class MaintenanceHistoryEntry(BaseModel):
    id: uuid.UUID
    status: str
    priority: str
    description: str
    requested_by_name: str
    submitted_at: Optional[datetime]
    completed_at: Optional[datetime]
    actual_cost: Optional[float]


class AssetHistoryResponse(BaseModel):
    asset_id: uuid.UUID
    asset_tag: str
    status_history: list[StatusHistoryEntry]
    allocation_history: list[AllocationHistoryEntry]
    maintenance_history: list[MaintenanceHistoryEntry]
