"""Add transfer_requests table.

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-12
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "transfer_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_allocation_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("allocations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("requested_by_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requested_for_user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("requested_for_dept_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_by_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column(
            "status",
            sa.Enum("PENDING", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED",
                    name="transferstatus"),
            nullable=False, server_default="PENDING",
        ),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("review_notes", sa.Text, nullable=True),
        sa.Column("expected_return_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_transfer_requests_asset_id", "transfer_requests", ["asset_id"])
    op.create_index("ix_transfer_requests_status", "transfer_requests", ["status"])
    op.create_index("ix_transfer_requests_requested_by_id", "transfer_requests", ["requested_by_id"])


def downgrade() -> None:
    op.drop_table("transfer_requests")
    sa.Enum(name="transferstatus").drop(op.get_bind(), checkfirst=True)
