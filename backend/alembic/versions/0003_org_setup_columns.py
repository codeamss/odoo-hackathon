"""Add org setup columns: departments.parent_dept_id, departments.is_active,
asset_categories.is_active, asset_categories.warranty_period_months,
asset_categories.requires_maintenance, asset_categories.maintenance_interval_days

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── departments: add parent hierarchy + active flag ─────────────────────
    op.add_column(
        "departments",
        sa.Column("parent_dept_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_departments_parent_dept_id",
        "departments", "departments",
        ["parent_dept_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_departments_parent_dept_id", "departments", ["parent_dept_id"])
    op.add_column(
        "departments",
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )

    # ── asset_categories: add category-specific + active flag ────────────────
    op.add_column(
        "asset_categories",
        sa.Column("warranty_period_months", sa.Integer, nullable=True),
    )
    op.add_column(
        "asset_categories",
        sa.Column(
            "requires_maintenance", sa.Boolean,
            nullable=False, server_default="false"
        ),
    )
    op.add_column(
        "asset_categories",
        sa.Column("maintenance_interval_days", sa.Integer, nullable=True),
    )
    op.add_column(
        "asset_categories",
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )


def downgrade() -> None:
    op.drop_column("asset_categories", "is_active")
    op.drop_column("asset_categories", "maintenance_interval_days")
    op.drop_column("asset_categories", "requires_maintenance")
    op.drop_column("asset_categories", "warranty_period_months")
    op.drop_index("ix_departments_parent_dept_id", table_name="departments")
    op.drop_constraint("fk_departments_parent_dept_id", "departments", type_="foreignkey")
    op.drop_column("departments", "is_active")
    op.drop_column("departments", "parent_dept_id")
