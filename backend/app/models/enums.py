"""
All application-wide enumerations in one place.
SQLAlchemy uses native PostgreSQL enums for these.
"""
import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"       # Department Head / Asset Manager
    AUDITOR = "AUDITOR"
    EMPLOYEE = "EMPLOYEE"
    VIEWER = "VIEWER"


class AssetStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ALLOCATED = "ALLOCATED"
    RESERVED = "RESERVED"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"
    LOST = "LOST"
    RETIRED = "RETIRED"
    DISPOSED = "DISPOSED"


class AllocationStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    RETURNED = "RETURNED"
    REVOKED = "REVOKED"


class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"


class MaintenanceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class MaintenancePriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AuditCycleStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class DiscrepancyType(str, enum.Enum):
    NONE = "NONE"
    LOCATION_MISMATCH = "LOCATION_MISMATCH"
    STATUS_MISMATCH = "STATUS_MISMATCH"
    MISSING = "MISSING"
    DAMAGED = "DAMAGED"
    UNREGISTERED = "UNREGISTERED"


class NotificationType(str, enum.Enum):
    OVERDUE_RETURN = "OVERDUE_RETURN"
    BOOKING_REMINDER = "BOOKING_REMINDER"
    MAINTENANCE_UPDATE = "MAINTENANCE_UPDATE"
    AUDIT_ASSIGNED = "AUDIT_ASSIGNED"
    ALLOCATION_UPDATE = "ALLOCATION_UPDATE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
