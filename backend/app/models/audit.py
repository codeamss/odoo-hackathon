"""Audit Cycle and Audit Finding models."""
import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import AuditCycleStatus, DiscrepancyType


class AuditCycle(Base):
    __tablename__ = "audit_cycles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[AuditCycleStatus] = mapped_column(
        Enum(AuditCycleStatus, name="auditcyclestatus", create_type=False),
        nullable=False, default=AuditCycleStatus.PLANNED, server_default="PLANNED", index=True,
    )
    scope_department_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    scope_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scheduled_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scheduled_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actual_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])  # noqa: F821
    scope_department: Mapped["Department"] = relationship("Department", foreign_keys=[scope_department_id])  # noqa: F821
    auditors: Mapped[list["AuditCycleAuditor"]] = relationship("AuditCycleAuditor", back_populates="cycle", cascade="all, delete-orphan")
    findings: Mapped[list["AuditFinding"]] = relationship("AuditFinding", back_populates="cycle", cascade="all, delete-orphan")


class AuditCycleAuditor(Base):
    __tablename__ = "audit_cycle_auditors"

    audit_cycle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    cycle: Mapped["AuditCycle"] = relationship("AuditCycle", back_populates="auditors")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])  # noqa: F821


class AuditFinding(Base):
    __tablename__ = "audit_findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_cycle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    auditor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expected_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    observed_status: Mapped[str | None] = mapped_column(String(50), nullable=True)  # VERIFIED|MISSING|DAMAGED
    discrepancy_type: Mapped[DiscrepancyType] = mapped_column(
        Enum(DiscrepancyType, name="discrepancytype", create_type=False),
        nullable=False, default=DiscrepancyType.NONE, server_default="NONE",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    cycle: Mapped["AuditCycle"] = relationship("AuditCycle", back_populates="findings")
    asset: Mapped["Asset"] = relationship("Asset", foreign_keys=[asset_id])  # noqa: F821
    auditor: Mapped["User"] = relationship("User", foreign_keys=[auditor_id])  # noqa: F821
