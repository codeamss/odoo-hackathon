"""
AssetCategory model.
Groups assets by type (e.g. Laptop, Vehicle, Projector).
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Financial / lifecycle metadata
    depreciation_rate: Mapped[float | None] = mapped_column(
        Numeric(5, 2), nullable=True, comment="Annual depreciation rate as a percentage"
    )
    useful_life_years: Mapped[int | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    assets: Mapped[list["Asset"]] = relationship(  # noqa: F821
        "Asset", back_populates="category"
    )

    def __repr__(self) -> str:
        return f"<AssetCategory id={self.id} name={self.name}>"
