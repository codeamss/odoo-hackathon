"""Pydantic schemas for Asset Category endpoints."""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class AssetCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    depreciation_rate: float | None = Field(default=None, ge=0, le=100)
    useful_life_years: int | None = Field(default=None, ge=1)
    warranty_period_months: int | None = Field(default=None, ge=0)
    requires_maintenance: bool = False
    maintenance_interval_days: int | None = Field(default=None, ge=1)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class AssetCategoryCreate(AssetCategoryBase):
    pass


class AssetCategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    depreciation_rate: float | None = Field(default=None, ge=0, le=100)
    useful_life_years: int | None = Field(default=None, ge=1)
    warranty_period_months: int | None = Field(default=None, ge=0)
    requires_maintenance: bool | None = None
    maintenance_interval_days: int | None = Field(default=None, ge=1)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str | None) -> str | None:
        return v.strip() if v else v


class AssetCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    depreciation_rate: float | None
    useful_life_years: int | None
    warranty_period_months: int | None
    requires_maintenance: bool
    maintenance_interval_days: int | None
    is_active: bool
    asset_count: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class AssetCategoryListResponse(BaseModel):
    total: int
    items: list[AssetCategoryResponse]
