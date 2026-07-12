"""Initial migration: users and departments tables

Revision ID: 0001
Revises:
Create Date: 2026-07-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enums ──────────────────────────────────────────────────────────────────
    userrole = postgresql.ENUM(
        "SUPER_ADMIN", "ADMIN", "MANAGER", "AUDITOR", "EMPLOYEE", "VIEWER",
        name="userrole",
    )
    userrole.create(op.get_bind(), checkfirst=True)

    # ── departments ────────────────────────────────────────────────────────────
    # Created before users because users.department_id references it.
    # manager_id is added as a separate ALTER after users exists.
    op.create_table(
        "departments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("manager_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_departments_name", "departments", ["name"], unique=True)

    # ── users ──────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "SUPER_ADMIN", "ADMIN", "MANAGER", "AUDITOR", "EMPLOYEE", "VIEWER",
                name="userrole",
                create_type=False,
            ),
            nullable=False,
            server_default="EMPLOYEE",
        ),
        sa.Column(
            "department_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("password_reset_token", sa.String(512), nullable=True),
        sa.Column("password_reset_expires", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refresh_token", sa.String(512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_department_id", "users", ["department_id"])

    # ── departments.manager_id FK (deferred — users table now exists) ──────────
    op.create_foreign_key(
        "fk_departments_manager_id_users",
        "departments",
        "users",
        ["manager_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_departments_manager_id_users", "departments", type_="foreignkey")
    op.drop_index("ix_users_department_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_index("ix_departments_name", table_name="departments")
    op.drop_table("departments")

    postgresql.ENUM(name="userrole").drop(op.get_bind(), checkfirst=True)
