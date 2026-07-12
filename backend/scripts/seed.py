"""
Database seed script.

Run from the backend/ directory:
    python -m scripts.seed

What it does:
  1. Runs pending Alembic migrations (idempotent — safe to re-run).
  2. Creates the SUPER_ADMIN account if it does not already exist.
  3. Optionally creates sample departments and employee accounts for dev.

The SUPER_ADMIN credentials are read from the environment (.env file).
Never hardcode credentials — the .env.example contains safe defaults
that MUST be changed before any deployment.
"""
import sys
import uuid
from pathlib import Path

# Allow `from app.xxx import` when running as `python -m scripts.seed`
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from alembic import command as alembic_command
from alembic.config import Config as AlembicConfig

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User


# ── Run Alembic migrations ─────────────────────────────────────────────────────

def run_migrations() -> None:
    print("▶  Running Alembic migrations …")
    alembic_cfg = AlembicConfig(
        str(Path(__file__).resolve().parents[1] / "alembic.ini")
    )
    alembic_command.upgrade(alembic_cfg, "head")
    print("✔  Migrations complete.")


# ── Seed SUPER_ADMIN ───────────────────────────────────────────────────────────

def seed_super_admin(db) -> None:
    existing = (
        db.query(User)
        .filter(User.email == settings.SUPER_ADMIN_EMAIL.lower())
        .first()
    )
    if existing:
        print(f"⏭  SUPER_ADMIN already exists ({existing.email}) — skipping.")
        return

    super_admin = User(
        id=uuid.uuid4(),
        email=settings.SUPER_ADMIN_EMAIL.lower(),
        full_name=settings.SUPER_ADMIN_FULL_NAME,
        password_hash=hash_password(settings.SUPER_ADMIN_PASSWORD),
        role=UserRole.SUPER_ADMIN,
        is_active=True,
    )
    db.add(super_admin)
    db.commit()
    print(
        f"✔  SUPER_ADMIN created:\n"
        f"     Email   : {super_admin.email}\n"
        f"     Password: {settings.SUPER_ADMIN_PASSWORD}\n"
        f"   ⚠️  Change this password immediately in production!"
    )


# ── Optional dev fixtures ──────────────────────────────────────────────────────

def seed_dev_fixtures(db) -> None:
    """
    Creates a small set of realistic dev data so developers can
    explore the UI without manual setup.
    Only runs when APP_ENV == 'development'.
    """
    if settings.APP_ENV != "development":
        print("⏭  Skipping dev fixtures (APP_ENV != development).")
        return

    from app.models.department import Department

    # ── Departments ────────────────────────────────────────────────────────────
    dept_names = [
        ("Engineering", "Software and infrastructure teams"),
        ("Operations", "Day-to-day business operations"),
        ("Finance", "Financial planning and accounting"),
        ("Human Resources", "Talent acquisition and employee relations"),
    ]

    created_depts: list[Department] = []
    for name, desc in dept_names:
        existing_dept = db.query(Department).filter(Department.name == name).first()
        if not existing_dept:
            dept = Department(id=uuid.uuid4(), name=name, description=desc)
            db.add(dept)
            created_depts.append(dept)
        else:
            created_depts.append(existing_dept)

    db.commit()
    print(f"✔  {len(dept_names)} departments ensured.")

    # ── Sample users ───────────────────────────────────────────────────────────
    sample_users = [
        {
            "email": "admin@assetflow.com",
            "full_name": "Alice Admin",
            "role": UserRole.ADMIN,
            "department": "Engineering",
        },
        {
            "email": "manager@assetflow.com",
            "full_name": "Bob Manager",
            "role": UserRole.MANAGER,
            "department": "Operations",
        },
        {
            "email": "auditor@assetflow.com",
            "full_name": "Carol Auditor",
            "role": UserRole.AUDITOR,
            "department": "Finance",
        },
        {
            "email": "employee@assetflow.com",
            "full_name": "Dave Employee",
            "role": UserRole.EMPLOYEE,
            "department": "Engineering",
        },
    ]

    dept_map = {d.name: d for d in created_depts}
    default_password = "DevPassword@1"

    for u_data in sample_users:
        existing_user = (
            db.query(User).filter(User.email == u_data["email"]).first()
        )
        if existing_user:
            continue

        dept = dept_map.get(u_data["department"])
        user = User(
            id=uuid.uuid4(),
            email=u_data["email"],
            full_name=u_data["full_name"],
            password_hash=hash_password(default_password),
            role=u_data["role"],
            department_id=dept.id if dept else None,
            is_active=True,
        )
        db.add(user)

    db.commit()
    print(
        f"✔  Sample users created (password: {default_password!r}):\n"
        + "\n".join(f"     • {u['email']} [{u['role'].value}]" for u in sample_users)
    )


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    print("\n━━━  AssetFlow — Database Seed  ━━━\n")

    run_migrations()

    db = SessionLocal()
    try:
        seed_super_admin(db)
        seed_dev_fixtures(db)
    finally:
        db.close()

    print("\n✅  Seed complete.\n")


if __name__ == "__main__":
    main()
