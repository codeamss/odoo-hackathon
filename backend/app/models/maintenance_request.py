"""
MaintenanceRequest model — multi-step approval workflow.

Status flow:
  DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → IN_PROGRESS → COMPLETED
                                   ↘ REJECTED
  Any non-terminal state → CANCELLED
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import MaintenancePriority, MaintenanceStatus


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requested_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    status: Mapped[MaintenanceStatus] = mapped_column(
        Enum(MaintenanceStatus, name="maintenancestatus", create_type=True),
        nullable=False,
        default=MaintenanceStatus.DRAFT,
        server_default=MaintenanceStatus.DRAFT.value,
        index=True,
    )
    priority: Mapped[MaintenancePriority] = mapped_column(
        Enum(MaintenancePriority, name="maintenancepriority", create_type=True),
        nullable=False,
        default=MaintenancePriority.MEDIUM,
        server_default=MaintenancePriority.MEDIUM.value,
        index=True,
    )

    description: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_cost: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    actual_cost: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)

    # Workflow timestamps
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

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
    asset: Mapped["Asset"] = relationship(  # noqa: F821
        "Asset", back_populates="maintenance_requests"
    )
    requested_by: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[requested_by_id]
    )
    assigned_to: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[assigned_to_id]
    )
    approved_by: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[approved_by_id]
    )
    comments: Mapped[list["MaintenanceComment"]] = relationship(
        "MaintenanceComment", back_populates="request", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<MaintenanceRequest id={self.id} status={self.status}>"


class MaintenanceComment(Base):
    __tablename__ = "maintenance_comments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("maintenance_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    request: Mapped["MaintenanceRequest"] = relationship(
        "MaintenanceRequest", back_populates="comments"
    )
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])  # noqa: F821
