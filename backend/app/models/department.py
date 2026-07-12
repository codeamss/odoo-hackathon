"""
Department model.
Referenced by users, assets, and allocations.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # The manager is a User; nullable because the manager user may not exist yet
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

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
    manager: Mapped["User"] = relationship(  # noqa: F821
        "User",
        foreign_keys=[manager_id],
        primaryjoin="Department.manager_id == User.id",
    )
    members: Mapped[list["User"]] = relationship(  # noqa: F821
        "User",
        back_populates="department",
        foreign_keys="User.department_id",
    )

    def __repr__(self) -> str:
        return f"<Department id={self.id} name={self.name}>"
