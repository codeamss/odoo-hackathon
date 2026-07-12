"""Booking schemas."""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator


class BookingCreate(BaseModel):
    asset_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    purpose: Optional[str] = None

    @model_validator(mode="after")
    def end_after_start(self) -> "BookingCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time.")
        return self


class BookingUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    purpose: Optional[str] = None

    @model_validator(mode="after")
    def end_after_start(self) -> "BookingUpdate":
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time.")
        return self


class AssetBrief(BaseModel):
    id: uuid.UUID
    asset_tag: str
    name: str
    location: Optional[str]
    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    model_config = {"from_attributes": True}


class BookingResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset: AssetBrief
    booked_by_id: uuid.UUID
    booked_by: UserBrief
    status: str
    start_time: datetime
    end_time: datetime
    purpose: Optional[str]
    computed_status: str   # UPCOMING | ONGOING | COMPLETED | CANCELLED
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    total: int
    items: list[BookingResponse]


class CalendarSlot(BaseModel):
    booking_id: uuid.UUID
    booked_by_name: str
    status: str
    start_time: datetime
    end_time: datetime
    purpose: Optional[str]
