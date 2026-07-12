"""Pydantic schemas for User / Employee Directory endpoints."""
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import UserRole

# Roles admins are allowed to assign (no self-elevating to SUPER_ADMIN)
ASSIGNABLE_ROLES = {UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.AUDITOR, UserRole.VIEWER}


class DeptInfo(BaseModel):
    id: uuid.UUID
    name: str
    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    department_id: uuid.UUID | None
    department: DeptInfo | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    total: int
    items: list[UserResponse]


class UpdateRoleRequest(BaseModel):
    """Used by admins to promote/demote an employee's role."""
    role: UserRole

    @field_validator("role")
    @classmethod
    def role_must_be_assignable(cls, v: UserRole) -> UserRole:
        if v not in ASSIGNABLE_ROLES:
            raise ValueError(
                f"Role '{v.value}' cannot be assigned. "
                f"Assignable roles: {', '.join(r.value for r in ASSIGNABLE_ROLES)}"
            )
        return v


class UpdateUserRequest(BaseModel):
    """General user profile update (admin use)."""
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    department_id: uuid.UUID | None = None
    is_active: bool | None = None

    @field_validator("full_name")
    @classmethod
    def strip_name(cls, v: str | None) -> str | None:
        return v.strip() if v else v
