"""
Import all models here so that Alembic's `target_metadata` picks them up
via `Base.metadata` when `env.py` does `from app.models import *`.
"""
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
from app.models.user import User

__all__ = [
    "User",
    "Department",
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
