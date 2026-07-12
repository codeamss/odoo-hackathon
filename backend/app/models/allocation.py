"""
Allocation model.

Business rules enforced at service layer:
  - Only one ACTIVE allocation per asset at a time
    (partial unique index: asset_id WHERE status = 'ACTIVE')
  - allocated_to_user XOR allocated_to_dept must be non-null
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AllocationStatus


class Allocation(Base):
    __tablename__ = "allocations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Allocate to a user OR a department (not both; validated in service)
    allocated_to_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    allocated_to_dept_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    allocated_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    status: Mapped[AllocationStatus] = mapped_column(
        Enum(AllocationStatus, name="allocationstatus", create_type=True),
        nullable=False,
        default=AllocationStatus.ACTIVE,
        server_default=AllocationStatus.ACTIVE.value,
        index=True,
    )

    allocated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expected_return_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    actual_return_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

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
    asset: Mapped["Asset"] = relationship("Asset", back_populates="allocations")  # noqa: F821
    allocated_to_user: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[allocated_to_user_id]
    )
    allocated_to_dept: Mapped["Department"] = relationship(  # noqa: F821
        "Department", foreign_keys=[allocated_to_dept_id]
    )
    allocated_by: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[allocated_by_id]
    )

    def __repr__(self) -> str:
        return f"<Allocation id={self.id} asset={self.asset_id} status={self.status}>"
