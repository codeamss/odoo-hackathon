"""Add audit_cycles, audit_cycle_auditors, audit_findings tables.

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-12
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_cycles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.Enum("PLANNED","IN_PROGRESS","COMPLETED","CANCELLED", name="auditcyclestatus"), nullable=False, server_default="PLANNED"),
        sa.Column("scope_department_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("scope_location", sa.String(255), nullable=True),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actual_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_audit_cycles_status", "audit_cycles", ["status"])

    op.create_table(
        "audit_cycle_auditors",
        sa.Column("audit_cycle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audit_cycles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "audit_findings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("audit_cycle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audit_cycles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("auditor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("expected_status", sa.String(50), nullable=True),
        sa.Column("observed_status", sa.String(50), nullable=True),
        sa.Column("discrepancy_type", sa.Enum("NONE","LOCATION_MISMATCH","STATUS_MISMATCH","MISSING","DAMAGED","UNREGISTERED", name="discrepancytype"), nullable=False, server_default="NONE"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("resolved", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_audit_findings_audit_cycle_id", "audit_findings", ["audit_cycle_id"])
    op.create_index("ix_audit_findings_asset_id", "audit_findings", ["asset_id"])


def downgrade() -> None:
    op.drop_table("audit_findings")
    op.drop_table("audit_cycle_auditors")
    op.drop_table("audit_cycles")
