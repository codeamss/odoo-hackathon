"""
Database seed script -- full mock data for workflow testing.

Run from the backend/ directory:
    python -m scripts.seed

Creates:
  - SUPER_ADMIN account
  - 4 departments, 4 asset categories
  - 6 users (admin, manager, auditor, 3 employees)
  - 12 assets (mix of statuses, bookable/non-bookable)
  - 4 active allocations (2 overdue)
  - 2 returned allocations
  - 3 bookings (upcoming, ongoing, cancelled)
  - 3 maintenance requests (different workflow stages)
  - 1 transfer request (pending)
  - 1 audit cycle with findings
  - 10 notifications (mix of types)
  - 15 activity log entries
"""
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from alembic import command as alembic_command
from alembic.config import Config as AlembicConfig

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import (
    AllocationStatus, AssetStatus, AuditCycleStatus, BookingStatus,
    DiscrepancyType, MaintenancePriority, MaintenanceStatus,
    NotificationType, UserRole,
)
from app.models.user import User


def _now(): return datetime.now(timezone.utc)
def _days(n): return _now() + timedelta(days=n)
def _uid(): return uuid.uuid4()


def run_migrations() -> None:
    print("[..] Running Alembic migrations ...")
    alembic_cfg = AlembicConfig(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    alembic_command.upgrade(alembic_cfg, "head")
    print("[OK] Migrations complete.")


def seed_super_admin(db) -> User:
    existing = db.query(User).filter(User.email == settings.SUPER_ADMIN_EMAIL.lower()).first()
    if existing:
        print(f"[--] SUPER_ADMIN already exists -- skipping.")
        return existing
    sa = User(
        id=_uid(), email=settings.SUPER_ADMIN_EMAIL.lower(),
        full_name=settings.SUPER_ADMIN_FULL_NAME,
        password_hash=hash_password(settings.SUPER_ADMIN_PASSWORD),
        role=UserRole.SUPER_ADMIN, is_active=True,
    )
    db.add(sa); db.commit()
    print(f"[OK] SUPER_ADMIN: {sa.email} / {settings.SUPER_ADMIN_PASSWORD}")
    return sa


def seed_mock_data(db) -> None:
    if settings.APP_ENV != "development":
        print("[--] Skipping mock data (APP_ENV != development).")
        return

    from app.models.allocation import Allocation
    from app.models.asset import Asset, AssetStatusHistory
    from app.models.asset_category import AssetCategory
    from app.models.audit import AuditCycle, AuditCycleAuditor, AuditFinding
    from app.models.booking import Booking
    from app.models.department import Department
    from app.models.maintenance_request import MaintenanceRequest
    from app.models.notification import ActivityLog, Notification
    from app.models.transfer_request import TransferRequest, TransferStatus

    # ── Skip if data already exists ───────────────────────────────────────────
    if db.query(Department).first():
        print("[--] Mock data already exists -- skipping.")
        return

    pw = "DevPassword@1"
    print(f"[..] Creating mock data (password for all dev users: {pw!r}) ...")

    # ── Departments ────────────────────────────────────────────────────────────
    eng  = Department(id=_uid(), name="Engineering",     description="Software & infrastructure", is_active=True)
    ops  = Department(id=_uid(), name="Operations",      description="Day-to-day business ops",   is_active=True)
    fin  = Department(id=_uid(), name="Finance",         description="Financial planning",          is_active=True)
    hr   = Department(id=_uid(), name="Human Resources", description="Talent & employee relations", is_active=True)
    for d in [eng, ops, fin, hr]: db.add(d)
    db.flush()

    # ── Users ──────────────────────────────────────────────────────────────────
    def user(email, name, role, dept):
        return User(id=_uid(), email=email, full_name=name,
                    password_hash=hash_password(pw), role=role,
                    department_id=dept.id, is_active=True)

    admin   = user("admin@assetflow.com",    "Alice Admin",   UserRole.ADMIN,    eng)
    mgr     = user("manager@assetflow.com",  "Bob Manager",   UserRole.MANAGER,  ops)
    auditor = user("auditor@assetflow.com",  "Carol Auditor", UserRole.AUDITOR,  fin)
    emp1    = user("dave@assetflow.com",     "Dave Wilson",   UserRole.EMPLOYEE, eng)
    emp2    = user("eve@assetflow.com",      "Eve Martinez",  UserRole.EMPLOYEE, ops)
    emp3    = user("frank@assetflow.com",    "Frank Lee",     UserRole.EMPLOYEE, hr)
    for u in [admin, mgr, auditor, emp1, emp2, emp3]: db.add(u)
    db.flush()

    # Set department managers AFTER users are flushed
    eng.manager_id = mgr.id
    ops.manager_id = mgr.id
    db.flush()

    # ── Asset categories ───────────────────────────────────────────────────────
    cat_laptop  = AssetCategory(id=_uid(), name="Laptops",      warranty_period_months=24,  useful_life_years=4,  depreciation_rate=25, requires_maintenance=False, is_active=True)
    cat_vehicle = AssetCategory(id=_uid(), name="Vehicles",     warranty_period_months=36,  useful_life_years=8,  depreciation_rate=15, requires_maintenance=True,  maintenance_interval_days=90, is_active=True)
    cat_office  = AssetCategory(id=_uid(), name="Office Equipment", warranty_period_months=12, useful_life_years=6, depreciation_rate=10, requires_maintenance=False, is_active=True)
    cat_av      = AssetCategory(id=_uid(), name="AV Equipment", warranty_period_months=12,  useful_life_years=5,  depreciation_rate=20, requires_maintenance=False, is_active=True, description="Projectors, screens, cameras")
    for c in [cat_laptop, cat_vehicle, cat_office, cat_av]: db.add(c)
    db.flush()

    # ── Assets ────────────────────────────────────────────────────────────────
    def asset(tag, name, cat, dept, status, bookable=False, location="HQ", sn=None, cost=None, warranty_days=730):
        return Asset(
            id=_uid(), asset_tag=tag, name=name, category_id=cat.id,
            department_id=dept.id, status=status, is_bookable=bookable,
            location=location, serial_number=sn or f"SN-{tag}",
            purchase_cost=cost or 1000.0, current_value=(cost or 1000.0) * 0.7,
            purchase_date=(_now() - timedelta(days=365)).date(),
            warranty_expiry_date=(_now() + timedelta(days=warranty_days)).date(),
            condition="Good",
        )

    a1  = asset("AF-00001", "Dell XPS 15 Laptop",        cat_laptop,  eng, AssetStatus.ALLOCATED,          sn="SN-DX15-001", cost=1800)
    a2  = asset("AF-00002", "MacBook Pro 14\"",           cat_laptop,  eng, AssetStatus.ALLOCATED,          sn="SN-MBP14-002", cost=2200)
    a3  = asset("AF-00003", "Lenovo ThinkPad X1",         cat_laptop,  ops, AssetStatus.AVAILABLE,          sn="SN-TP-003",    cost=1500)
    a4  = asset("AF-00004", "HP EliteBook 840",           cat_laptop,  fin, AssetStatus.AVAILABLE,          sn="SN-HP840-004", cost=1300)
    a5  = asset("AF-00005", "Toyota Corolla - Company Car", cat_vehicle, ops, AssetStatus.AVAILABLE,        sn="TYT-2023-005",  cost=25000, warranty_days=1095)
    a6  = asset("AF-00006", "Honda Civic - Fleet Car",    cat_vehicle,  ops, AssetStatus.ALLOCATED,         sn="HND-2022-006",  cost=22000, warranty_days=730)
    a7  = asset("AF-00007", "Epson Projector EB-X41",     cat_av,       eng, AssetStatus.AVAILABLE,         bookable=True, location="Conference Room A", sn="EP-X41-007", cost=600)
    a8  = asset("AF-00008", "Sony Bravia 65\" Screen",    cat_av,       ops, AssetStatus.AVAILABLE,         bookable=True, location="Board Room",        sn="SNY-65-008",  cost=1200)
    a9  = asset("AF-00009", "Office Desk - Standing",     cat_office,   hr,  AssetStatus.ALLOCATED,         sn="DESK-009",     cost=800)
    a10 = asset("AF-00010", "Ergonomic Chair Steelcase",  cat_office,   hr,  AssetStatus.AVAILABLE,         sn="CHAIR-010",    cost=600)
    a11 = asset("AF-00011", "Logitech Conference Camera", cat_av,       eng, AssetStatus.UNDER_MAINTENANCE, bookable=True, location="Meeting Room B", sn="LGTH-CAM-011", cost=400)
    a12 = asset("AF-00012", "iPad Pro 12.9\"",            cat_laptop,   fin, AssetStatus.RESERVED,          sn="IPAD-012",    cost=1100)

    for a in [a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12]: db.add(a)
    db.flush()

    # Status history for assets
    def hist(asset, from_s, to_s, by, reason):
        db.add(AssetStatusHistory(id=_uid(), asset_id=asset.id, from_status=from_s,
               to_status=to_s, changed_by_id=by.id, reason=reason))

    hist(a1,  AssetStatus.AVAILABLE, AssetStatus.ALLOCATED,          admin,   "Allocated to Dave Wilson")
    hist(a2,  AssetStatus.AVAILABLE, AssetStatus.ALLOCATED,          admin,   "Allocated to Eve Martinez")
    hist(a6,  AssetStatus.AVAILABLE, AssetStatus.ALLOCATED,          mgr,     "Fleet car assigned to Operations")
    hist(a9,  AssetStatus.AVAILABLE, AssetStatus.ALLOCATED,          admin,   "Standing desk for HR")
    hist(a11, AssetStatus.AVAILABLE, AssetStatus.UNDER_MAINTENANCE,  admin,   "Camera lens damaged, sent for repair")
    hist(a12, AssetStatus.AVAILABLE, AssetStatus.RESERVED,           admin,   "Reserved for Finance audit")
    db.flush()

    # ── Allocations ────────────────────────────────────────────────────────────
    def alloc(asset, to_user, by, days_ago, return_in=None, status=AllocationStatus.ACTIVE, notes=None):
        exp = _now() + timedelta(days=return_in) if return_in else None
        return Allocation(
            id=_uid(), asset_id=asset.id,
            allocated_to_user_id=to_user.id,
            allocated_by_id=by.id, status=status,
            allocated_at=_now() - timedelta(days=days_ago),
            expected_return_date=exp, notes=notes,
        )

    # Active allocations
    al1 = alloc(a1, emp1, admin, 30,  return_in=7,   notes="Primary work laptop")
    al2 = alloc(a2, emp2, admin, 60,  return_in=-5,  notes="Overdue! Employee on leave")   # overdue
    al3 = alloc(a6, emp2, mgr,  15,  return_in=-10, notes="Fleet car - overdue return")    # overdue
    al4 = alloc(a9, emp3, admin, 45,  return_in=30,  notes="Standing desk for HR office")

    # Returned allocations
    al5 = alloc(a3, emp1, admin, 90, status=AllocationStatus.RETURNED, notes="Returned in good condition")
    al5.actual_return_date = _now() - timedelta(days=60)
    al6 = alloc(a4, emp3, admin, 120, status=AllocationStatus.RETURNED, notes="Returned after project end")
    al6.actual_return_date = _now() - timedelta(days=80)

    for al in [al1, al2, al3, al4, al5, al6]: db.add(al)
    db.flush()

    # Fix overdue expected_return_dates (past dates)
    al2.expected_return_date = _now() - timedelta(days=5)
    al3.expected_return_date = _now() - timedelta(days=10)
    db.flush()

    # ── Transfer request ───────────────────────────────────────────────────────
    tr1 = TransferRequest(
        id=_uid(), asset_id=a1.id, from_allocation_id=al1.id,
        requested_by_id=emp2.id, requested_for_user_id=emp2.id,
        status=TransferStatus.PENDING,
        reason="Eve needs the Dell XPS for the new project. Dave has a backup.",
    )
    db.add(tr1)

    # ── Bookings ───────────────────────────────────────────────────────────────
    bk1 = Booking(id=_uid(), asset_id=a7.id, booked_by_id=emp1.id,
                  status=BookingStatus.CONFIRMED,
                  start_time=_days(1).replace(hour=9,  minute=0,  second=0, microsecond=0),
                  end_time  =_days(1).replace(hour=10, minute=0,  second=0, microsecond=0),
                  purpose="Sprint planning meeting")
    bk2 = Booking(id=_uid(), asset_id=a8.id, booked_by_id=emp2.id,
                  status=BookingStatus.CONFIRMED,
                  start_time=_days(2).replace(hour=14, minute=0,  second=0, microsecond=0),
                  end_time  =_days(2).replace(hour=16, minute=0,  second=0, microsecond=0),
                  purpose="Board presentation")
    bk3 = Booking(id=_uid(), asset_id=a7.id, booked_by_id=emp3.id,
                  status=BookingStatus.CANCELLED,
                  start_time=_days(-1).replace(hour=10, minute=0, second=0, microsecond=0),
                  end_time  =_days(-1).replace(hour=11, minute=0, second=0, microsecond=0),
                  purpose="HR interview (cancelled)")
    bk4 = Booking(id=_uid(), asset_id=a7.id, booked_by_id=emp1.id,
                  status=BookingStatus.CONFIRMED,
                  start_time=_days(3).replace(hour=13, minute=0,  second=0, microsecond=0),
                  end_time  =_days(3).replace(hour=14, minute=30, second=0, microsecond=0),
                  purpose="Client demo")
    for b in [bk1, bk2, bk3, bk4]: db.add(b)

    # ── Maintenance requests ───────────────────────────────────────────────────
    mr1 = MaintenanceRequest(
        id=_uid(), asset_id=a11.id, requested_by_id=emp1.id,
        status=MaintenanceStatus.IN_PROGRESS, priority=MaintenancePriority.HIGH,
        description="Conference camera lens cracked after being dropped. Needs lens replacement.",
        assigned_to_id=emp2.id, approved_by_id=admin.id,
        submitted_at=_now() - timedelta(days=5),
        approved_at=_now() - timedelta(days=3),
        estimated_cost=150.0,
    )
    mr2 = MaintenanceRequest(
        id=_uid(), asset_id=a5.id, requested_by_id=mgr.id,
        status=MaintenanceStatus.SUBMITTED, priority=MaintenancePriority.MEDIUM,
        description="Toyota Corolla requires scheduled oil change and brake inspection.",
        submitted_at=_now() - timedelta(days=2),
    )
    mr3 = MaintenanceRequest(
        id=_uid(), asset_id=a3.id, requested_by_id=emp1.id,
        status=MaintenanceStatus.DRAFT, priority=MaintenancePriority.LOW,
        description="ThinkPad keyboard has a stuck key (spacebar sticking occasionally).",
    )
    mr4 = MaintenanceRequest(
        id=_uid(), asset_id=a2.id, requested_by_id=emp2.id,
        status=MaintenanceStatus.COMPLETED, priority=MaintenancePriority.CRITICAL,
        description="MacBook Pro battery swollen. Emergency replacement required.",
        assigned_to_id=emp3.id, approved_by_id=admin.id,
        submitted_at=_now() - timedelta(days=20),
        approved_at=_now() - timedelta(days=19),
        completed_at=_now() - timedelta(days=14),
        estimated_cost=200.0, actual_cost=185.0,
    )
    for m in [mr1, mr2, mr3, mr4]: db.add(m)

    # ── Audit cycle ────────────────────────────────────────────────────────────
    from app.models.audit import AuditCycle, AuditCycleAuditor, AuditFinding
    cyc = AuditCycle(
        id=_uid(), name="Q3 2026 Physical Audit",
        description="Quarterly verification of all Engineering and Operations assets.",
        created_by_id=admin.id, status=AuditCycleStatus.IN_PROGRESS,
        scope_location="HQ Floors 1-3",
        scheduled_start=_now() - timedelta(days=7),
        scheduled_end=_days(7),
    )
    db.add(cyc); db.flush()

    db.add(AuditCycleAuditor(audit_cycle_id=cyc.id, user_id=auditor.id))
    db.add(AuditCycleAuditor(audit_cycle_id=cyc.id, user_id=mgr.id))

    findings = [
        AuditFinding(id=_uid(), audit_cycle_id=cyc.id, asset_id=a1.id,
                     auditor_id=auditor.id, expected_status="ALLOCATED",
                     observed_status="VERIFIED", discrepancy_type=DiscrepancyType.NONE,
                     notes="Asset confirmed with Dave Wilson, Engineering floor 2."),
        AuditFinding(id=_uid(), audit_cycle_id=cyc.id, asset_id=a7.id,
                     auditor_id=auditor.id, expected_status="AVAILABLE",
                     observed_status="VERIFIED", discrepancy_type=DiscrepancyType.NONE,
                     notes="Projector in Conference Room A, good condition."),
        AuditFinding(id=_uid(), audit_cycle_id=cyc.id, asset_id=a10.id,
                     auditor_id=mgr.id, expected_status="AVAILABLE",
                     observed_status="DAMAGED", discrepancy_type=DiscrepancyType.DAMAGED,
                     notes="Chair has broken armrest. Needs repair before next use."),
        AuditFinding(id=_uid(), audit_cycle_id=cyc.id, asset_id=a4.id,
                     auditor_id=mgr.id, expected_status="AVAILABLE",
                     observed_status="MISSING", discrepancy_type=DiscrepancyType.MISSING,
                     notes="HP EliteBook not found at Finance desk. May have been moved."),
    ]
    for f in findings: db.add(f)

    # ── Notifications ──────────────────────────────────────────────────────────
    from app.models.notification import Notification, ActivityLog

    notifs = [
        Notification(id=_uid(), recipient_id=emp1.id, type=NotificationType.ALLOCATION_UPDATE,
                     title="Asset Allocated to You",
                     body="Dell XPS 15 Laptop (AF-00001) has been allocated to you by Alice Admin.",
                     is_read=True, reference_type="allocation", reference_id=al1.id),
        Notification(id=_uid(), recipient_id=emp2.id, type=NotificationType.OVERDUE_RETURN,
                     title="Overdue Return Alert",
                     body="MacBook Pro 14 (AF-00002) was due for return 5 days ago. Please return it immediately.",
                     is_read=False, reference_type="allocation", reference_id=al2.id),
        Notification(id=_uid(), recipient_id=emp2.id, type=NotificationType.OVERDUE_RETURN,
                     title="Overdue Return Alert",
                     body="Honda Civic Fleet Car (AF-00006) was due for return 10 days ago.",
                     is_read=False, reference_type="allocation", reference_id=al3.id),
        Notification(id=_uid(), recipient_id=emp1.id, type=NotificationType.BOOKING_REMINDER,
                     title="Booking Reminder",
                     body="Your booking for Epson Projector (AF-00007) starts tomorrow at 9:00 AM.",
                     is_read=False, reference_type="booking", reference_id=bk1.id),
        Notification(id=_uid(), recipient_id=emp1.id, type=NotificationType.MAINTENANCE_UPDATE,
                     title="Maintenance Request Submitted",
                     body="Your maintenance request for Logitech Conference Camera (AF-00011) has been submitted for review.",
                     is_read=True, reference_type="maintenance", reference_id=mr1.id),
        Notification(id=_uid(), recipient_id=emp1.id, type=NotificationType.MAINTENANCE_UPDATE,
                     title="Maintenance Request Approved",
                     body="Your maintenance request for AF-00011 has been approved. Technician assigned.",
                     is_read=False, reference_type="maintenance", reference_id=mr1.id),
        Notification(id=_uid(), recipient_id=mgr.id, type=NotificationType.MAINTENANCE_UPDATE,
                     title="New Maintenance Request",
                     body="Dave Wilson raised a maintenance request for ThinkPad X1 (AF-00003). Priority: LOW.",
                     is_read=False, reference_type="maintenance", reference_id=mr3.id),
        Notification(id=_uid(), recipient_id=admin.id, type=NotificationType.ALLOCATION_UPDATE,
                     title="Transfer Request Pending",
                     body="Eve Martinez requested a transfer of Dell XPS 15 (AF-00001). Review required.",
                     is_read=False, reference_type="transfer", reference_id=tr1.id),
        Notification(id=_uid(), recipient_id=auditor.id, type=NotificationType.AUDIT_ASSIGNED,
                     title="Audit Cycle Assigned",
                     body="You have been assigned as auditor for 'Q3 2026 Physical Audit'. Cycle runs until next week.",
                     is_read=True, reference_type="audit_cycle", reference_id=cyc.id),
        Notification(id=_uid(), recipient_id=emp3.id, type=NotificationType.SYSTEM_ALERT,
                     title="Booking Cancelled",
                     body="Your booking for Epson Projector on Conference Room A has been cancelled.",
                     is_read=False, reference_type="booking", reference_id=bk3.id),
    ]
    for n in notifs: db.add(n)

    # ── Activity logs ──────────────────────────────────────────────────────────
    logs = [
        ("asset_registered",    "asset",       a1.id,   admin.id,   "Registered Dell XPS 15 Laptop (AF-00001)"),
        ("asset_registered",    "asset",       a2.id,   admin.id,   "Registered MacBook Pro 14 (AF-00002)"),
        ("asset_registered",    "asset",       a11.id,  admin.id,   "Registered Logitech Conference Camera (AF-00011)"),
        ("asset_allocated",     "allocation",  al1.id,  admin.id,   "Allocated AF-00001 to Dave Wilson"),
        ("asset_allocated",     "allocation",  al2.id,  admin.id,   "Allocated AF-00002 to Eve Martinez"),
        ("asset_returned",      "allocation",  al5.id,  emp1.id,    "Dave Wilson returned AF-00003 (ThinkPad X1)"),
        ("maintenance_created", "maintenance", mr1.id,  emp1.id,    "Raised maintenance request for AF-00011 (camera lens cracked)"),
        ("maintenance_approved","maintenance", mr1.id,  admin.id,   "Approved maintenance for AF-00011, assigned technician"),
        ("maintenance_completed","maintenance",mr4.id,  admin.id,   "MacBook battery replacement completed, actual cost $185"),
        ("booking_created",     "booking",     bk1.id,  emp1.id,    "Booked Epson Projector for Sprint Planning (tomorrow 9-10am)"),
        ("booking_created",     "booking",     bk2.id,  emp2.id,    "Booked Board Room Screen for presentation"),
        ("booking_cancelled",   "booking",     bk3.id,  emp3.id,    "Cancelled HR interview booking for projector"),
        ("transfer_requested",  "transfer",    tr1.id,  emp2.id,    "Eve Martinez requested transfer of AF-00001 from Dave Wilson"),
        ("audit_cycle_started", "audit_cycle", cyc.id,  admin.id,   "Started Q3 2026 Physical Audit cycle"),
        ("audit_finding_recorded","audit_finding", findings[2].id, auditor.id, "Flagged AF-00010 chair as DAMAGED during Q3 audit"),
    ]

    for action, entity_type, entity_id, actor_id, desc in logs:
        db.add(ActivityLog(
            id=_uid(), actor_id=actor_id, action=action,
            entity_type=entity_type, entity_id=entity_id, description=desc,
        ))

    db.commit()
    print("[OK] Mock data created:")
    print("     - 4 departments, 4 asset categories")
    print("     - 6 users (admin, manager, auditor, 3 employees)")
    print("     - 12 assets (allocated, available, under maintenance, reserved)")
    print("     - 4 active allocations (2 overdue), 2 returned")
    print("     - 1 pending transfer request")
    print("     - 4 bookings (3 upcoming/confirmed, 1 cancelled)")
    print("     - 4 maintenance requests (draft, submitted, in-progress, completed)")
    print("     - 1 active audit cycle with 4 findings (1 damaged, 1 missing)")
    print("     - 10 notifications, 15 activity log entries")


def main() -> None:
    print("\n===  AssetFlow - Database Seed  ===\n")
    run_migrations()
    db = SessionLocal()
    try:
        seed_super_admin(db)
        seed_mock_data(db)
    finally:
        db.close()
    print("\n[OK] Seed complete.\n")
    print("Credentials:")
    print("  superadmin@assetflow.com  /  SuperAdmin@123!")
    print("  admin@assetflow.com       /  DevPassword@1")
    print("  manager@assetflow.com     /  DevPassword@1")
    print("  auditor@assetflow.com     /  DevPassword@1")
    print("  dave@assetflow.com        /  DevPassword@1  (employee - has allocations)")
    print("  eve@assetflow.com         /  DevPassword@1  (employee - overdue returns)")
    print("  frank@assetflow.com       /  DevPassword@1  (employee - HR)")


if __name__ == "__main__":
    main()
