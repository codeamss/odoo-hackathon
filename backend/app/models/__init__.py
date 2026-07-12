"""
Import all models here so that Alembic's `target_metadata` picks them up
via `Base.metadata` when `env.py` does `from app.models import *`.
"""
from app.models.asset import Asset, AssetStatusHistory
from app.models.asset_category import AssetCategory
from app.models.allocation import Allocation
from app.models.booking import Booking
from app.models.department import Department
from app.models.enums import (
    AllocationStatus,
    AssetStatus,
    AuditCycleStatus,
    BookingStatus,
    DiscrepancyType,
    MaintenancePriority,
    MaintenanceStatus,
    NotificationType,
    UserRole,
)
from app.models.maintenance_request import MaintenanceComment, MaintenanceRequest
from app.models.user import User

__all__ = [
    "User",
    "Department",
    "AssetCategory",
    "Asset",
    "AssetStatusHistory",
    "Allocation",
    "Booking",
    "MaintenanceRequest",
    "MaintenanceComment",
    "UserRole",
    "AssetStatus",
    "AllocationStatus",
    "BookingStatus",
    "MaintenanceStatus",
    "MaintenancePriority",
    "AuditCycleStatus",
    "DiscrepancyType",
    "NotificationType",
]
