"""Pydantic schemas for Department endpoints."""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    parent_dept_id: uuid.UUID | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class DepartmentCreate(DepartmentBase):
    manager_id: uuid.UUID | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    manager_id: uuid.UUID | None = None
    parent_dept_id: uuid.UUID | None = None
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str | None) -> str | None:
        return v.strip() if v else v


class ManagerInfo(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    model_config = {"from_attributes": True}


class ParentDeptInfo(BaseModel):
    id: uuid.UUID
    name: str
    model_config = {"from_attributes": True}


class DepartmentResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    manager_id: uuid.UUID | None
    manager: ManagerInfo | None
    parent_dept_id: uuid.UUID | None
    parent: ParentDeptInfo | None
    is_active: bool
    member_count: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class DepartmentListResponse(BaseModel):
    total: int
    items: list[DepartmentResponse]
