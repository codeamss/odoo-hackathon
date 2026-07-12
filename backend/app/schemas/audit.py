"""Audit schemas."""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AuditCycleCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    scope_department_id: Optional[uuid.UUID] = None
    scope_location: Optional[str] = None
    scheduled_start: datetime
    scheduled_end: datetime
    auditor_ids: list[uuid.UUID] = []


class AuditCycleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None


class RecordFindingRequest(BaseModel):
    asset_id: uuid.UUID
    observed_status: str  # VERIFIED | MISSING | DAMAGED
    discrepancy_type: str = "NONE"
    notes: Optional[str] = None


class UserBrief(BaseModel):
    id: uuid.UUID; full_name: str; email: str
    model_config = {"from_attributes": True}


class AssetBrief(BaseModel):
    id: uuid.UUID; asset_tag: str; name: str; status: str
    model_config = {"from_attributes": True}


class FindingResponse(BaseModel):
    id: uuid.UUID; audit_cycle_id: uuid.UUID
    asset: AssetBrief; auditor: Optional[UserBrief]
    expected_status: Optional[str]; observed_status: Optional[str]
    discrepancy_type: str; notes: Optional[str]; resolved: bool; created_at: datetime
    model_config = {"from_attributes": True}


class AuditCycleResponse(BaseModel):
    id: uuid.UUID; name: str; description: Optional[str]
    created_by: UserBrief; status: str
    scope_department_id: Optional[uuid.UUID]
    scope_location: Optional[str]
    scheduled_start: datetime; scheduled_end: datetime; actual_end: Optional[datetime]
    auditor_ids: list[uuid.UUID]
    total_findings: int; discrepancy_count: int
    created_at: datetime; updated_at: datetime
    model_config = {"from_attributes": True}


class AuditCycleListResponse(BaseModel):
    total: int; items: list[AuditCycleResponse]


class DiscrepancyReport(BaseModel):
    audit_cycle_id: uuid.UUID; cycle_name: str; status: str
    total_assets_audited: int; verified: int; missing: int; damaged: int; other: int
    findings: list[FindingResponse]
