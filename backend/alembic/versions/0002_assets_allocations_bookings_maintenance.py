"""Add asset_categories, assets, asset_status_history, allocations, bookings,
maintenance_requests, maintenance_comments tables.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── asset_categories ───────────────────────────────────────────────────────
    op.create_table(
        "asset_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("depreciation_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("useful_life_years", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_asset_categories_name", "asset_categories", ["name"], unique=True)

    # ── assets ─────────────────────────────────────────────────────────────────
    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("asset_tag", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("serial_number", sa.String(255), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("asset_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("department_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "AVAILABLE", "ALLOCATED", "RESERVED", "UNDER_MAINTENANCE",
                "LOST", "RETIRED", "DISPOSED",
                name="assetstatus",
            ),
            nullable=False, server_default="AVAILABLE",
        ),
        sa.Column("purchase_date", sa.Date, nullable=True),
        sa.Column("purchase_cost", sa.Numeric(14, 2), nullable=True),
        sa.Column("current_value", sa.Numeric(14, 2), nullable=True),
        sa.Column("warranty_expiry_date", sa.Date, nullable=True),
        sa.Column("is_bookable", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_assets_asset_tag", "assets", ["asset_tag"], unique=True)
    op.create_index("ix_assets_name", "assets", ["name"])
    op.create_index("ix_assets_serial_number", "assets", ["serial_number"])
    op.create_index("ix_assets_status", "assets", ["status"])
    op.create_index("ix_assets_category_id", "assets", ["category_id"])
    op.create_index("ix_assets_department_id", "assets", ["department_id"])

    # ── asset_status_history ───────────────────────────────────────────────────
    op.create_table(
        "asset_status_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "from_status",
            sa.Enum(
                "AVAILABLE", "ALLOCATED", "RESERVED", "UNDER_MAINTENANCE",
                "LOST", "RETIRED", "DISPOSED",
                name="assetstatus", create_constraint=False,
            ),
            nullable=True,
        ),
        sa.Column(
            "to_status",
            sa.Enum(
                "AVAILABLE", "ALLOCATED", "RESERVED", "UNDER_MAINTENANCE",
                "LOST", "RETIRED", "DISPOSED",
                name="assetstatus", create_constraint=False,
            ),
            nullable=False,
        ),
        sa.Column("changed_by_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_asset_status_history_asset_id", "asset_status_history", ["asset_id"])

    # ── allocations ────────────────────────────────────────────────────────────
    op.create_table(
        "allocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("allocated_to_user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("allocated_to_dept_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("allocated_by_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "RETURNED", "REVOKED", name="allocationstatus"),
            nullable=False, server_default="ACTIVE",
        ),
        sa.Column("allocated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("expected_return_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_return_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_allocations_asset_id", "allocations", ["asset_id"])
    op.create_index("ix_allocations_status", "allocations", ["status"])
    op.create_index("ix_allocations_expected_return_date",
                    "allocations", ["expected_return_date"])
    op.create_index("ix_allocations_allocated_to_user_id",
                    "allocations", ["allocated_to_user_id"])
    # Partial unique index: one ACTIVE allocation per asset
    op.execute(
        "CREATE UNIQUE INDEX uq_allocations_active_asset "
        "ON allocations (asset_id) WHERE status = 'ACTIVE'"
    )

    # ── bookings ───────────────────────────────────────────────────────────────
    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("booked_by_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW",
                    name="bookingstatus"),
            nullable=False, server_default="PENDING",
        ),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("purpose", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_bookings_asset_id", "bookings", ["asset_id"])
    op.create_index("ix_bookings_booked_by_id", "bookings", ["booked_by_id"])
    op.create_index("ix_bookings_status", "bookings", ["status"])
    op.create_index("ix_bookings_start_time", "bookings", ["start_time"])
    op.create_index("ix_bookings_end_time", "bookings", ["end_time"])

    # ── maintenance_requests ───────────────────────────────────────────────────
    op.create_table(
        "maintenance_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requested_by_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("assigned_to_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("approved_by_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column(
            "status",
            sa.Enum("DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED",
                    "IN_PROGRESS", "COMPLETED", "REJECTED", "CANCELLED",
                    name="maintenancestatus"),
            nullable=False, server_default="DRAFT",
        ),
        sa.Column(
            "priority",
            sa.Enum("LOW", "MEDIUM", "HIGH", "CRITICAL", name="maintenancepriority"),
            nullable=False, server_default="MEDIUM",
        ),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("estimated_cost", sa.Numeric(14, 2), nullable=True),
        sa.Column("actual_cost", sa.Numeric(14, 2), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_maintenance_requests_asset_id", "maintenance_requests", ["asset_id"])
    op.create_index("ix_maintenance_requests_status", "maintenance_requests", ["status"])
    op.create_index("ix_maintenance_requests_priority", "maintenance_requests", ["priority"])
    op.create_index("ix_maintenance_requests_requested_by_id",
                    "maintenance_requests", ["requested_by_id"])

    # ── maintenance_comments ───────────────────────────────────────────────────
    op.create_table(
        "maintenance_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("maintenance_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("comment", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_maintenance_comments_request_id",
                    "maintenance_comments", ["request_id"])


def downgrade() -> None:
    op.drop_table("maintenance_comments")
    op.drop_table("maintenance_requests")
    op.drop_table("bookings")
    op.execute("DROP INDEX IF EXISTS uq_allocations_active_asset")
    op.drop_table("allocations")
    op.drop_table("asset_status_history")
    op.drop_table("assets")
    op.drop_table("asset_categories")
    for name in ["maintenancepriority", "maintenancestatus",
                 "bookingstatus", "allocationstatus", "assetstatus"]:
        sa.Enum(name=name).drop(op.get_bind(), checkfirst=True)
