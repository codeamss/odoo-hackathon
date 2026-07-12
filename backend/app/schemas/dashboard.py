"""
Pydantic schemas for the dashboard / KPI endpoints.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel


# ── KPI Cards ──────────────────────────────────────────────────────────────────

class KPICards(BaseModel):
    assets_available: int
    assets_allocated: int
    assets_under_maintenance: int
    assets_reserved: int
    maintenance_today: int        # requests submitted/active today
    active_bookings: int          # CONFIRMED bookings right now
    pending_bookings: int         # PENDING bookings awaiting confirmation
    overdue_returns: int          # ACTIVE allocations past expected_return_date
    upcoming_returns: int         # ACTIVE allocations due within next 7 days
    total_assets: int


# ── Overdue / Upcoming return rows ────────────────────────────────────────────

class ReturnItem(BaseModel):
    allocation_id: uuid.UUID
    asset_id: uuid.UUID
    asset_tag: str
    asset_name: str
    allocated_to: str             # user full_name or department name
    allocated_to_type: str        # "user" | "department"
    allocated_at: datetime
    expected_return_date: datetime
    days_overdue: int | None      # positive = overdue, None = upcoming
    department_name: str | None
    category_name: str | None

    model_config = {"from_attributes": True}


class OverdueReturnsResponse(BaseModel):
    total: int
    items: list[ReturnItem]


class UpcomingReturnsResponse(BaseModel):
    total: int
    days_ahead: int               # window used for the query
    items: list[ReturnItem]


# ── Recent maintenance activity ────────────────────────────────────────────────

class MaintenanceActivityItem(BaseModel):
    request_id: uuid.UUID
    asset_tag: str
    asset_name: str
    status: str
    priority: str
    requested_by: str
    submitted_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MaintenanceActivityResponse(BaseModel):
    total: int
    items: list[MaintenanceActivityItem]


# ── Active bookings snapshot ───────────────────────────────────────────────────

class ActiveBookingItem(BaseModel):
    booking_id: uuid.UUID
    asset_tag: str
    asset_name: str
    booked_by: str
    status: str
    start_time: datetime
    end_time: datetime
    purpose: str | None

    model_config = {"from_attributes": True}


class ActiveBookingsResponse(BaseModel):
    total: int
    items: list[ActiveBookingItem]
