"""
Asset model — the central entity of the entire system.

Status transitions enforced in the service layer:
  AVAILABLE       → ALLOCATED | RESERVED | UNDER_MAINTENANCE
  ALLOCATED       → AVAILABLE | UNDER_MAINTENANCE
  RESERVED        → AVAILABLE | ALLOCATED
  UNDER_MAINTENANCE → AVAILABLE | RETIRED
  LOST            → (terminal)
  RETIRED         → DISPOSED
  DISPOSED        → (terminal)
"""
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AssetStatus


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    asset_tag: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True,
        comment="Human-readable ID, e.g. AST-00042"
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Category & department ──────────────────────────────────────────────────
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("asset_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ── Status ─────────────────────────────────────────────────────────────────
    status: Mapped[AssetStatus] = mapped_column(
        Enum(AssetStatus, name="assetstatus", create_type=True),
        nullable=False,
        default=AssetStatus.AVAILABLE,
        server_default=AssetStatus.AVAILABLE.value,
        index=True,
    )

    # ── Financial ──────────────────────────────────────────────────────────────
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    purchase_cost: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    current_value: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    warranty_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # ── Booking flag ───────────────────────────────────────────────────────────
    is_bookable: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
        comment="If true, this asset can be reserved via the booking engine"
    )

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    category: Mapped["AssetCategory"] = relationship(  # noqa: F821
        "AssetCategory", back_populates="assets"
    )
    department: Mapped["Department"] = relationship(  # noqa: F821
        "Department", foreign_keys=[department_id]
    )
    status_history: Mapped[list["AssetStatusHistory"]] = relationship(  # noqa: F821
        "AssetStatusHistory", back_populates="asset", cascade="all, delete-orphan"
    )
    allocations: Mapped[list["Allocation"]] = relationship(  # noqa: F821
        "Allocation", back_populates="asset", cascade="all, delete-orphan"
    )
    bookings: Mapped[list["Booking"]] = relationship(  # noqa: F821
        "Booking", back_populates="asset", cascade="all, delete-orphan"
    )
    maintenance_requests: Mapped[list["MaintenanceRequest"]] = relationship(  # noqa: F821
        "MaintenanceRequest", back_populates="asset", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Asset tag={self.asset_tag} status={self.status}>"


class AssetStatusHistory(Base):
    """Immutable audit trail of every asset status change."""
    __tablename__ = "asset_status_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_status: Mapped[AssetStatus | None] = mapped_column(
        Enum(AssetStatus, name="assetstatus", create_type=False), nullable=True
    )
    to_status: Mapped[AssetStatus] = mapped_column(
        Enum(AssetStatus, name="assetstatus", create_type=False), nullable=False
    )
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    asset: Mapped["Asset"] = relationship("Asset", back_populates="status_history")
    changed_by: Mapped["User"] = relationship("User", foreign_keys=[changed_by_id])  # noqa: F821
