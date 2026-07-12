"""Audit service."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.asset import Asset, AssetStatusHistory
from app.models.audit import AuditCycle, AuditCycleAuditor, AuditFinding
from app.models.enums import AssetStatus, AuditCycleStatus, DiscrepancyType, UserRole
from app.models.user import User
from app.schemas.audit import (
    AssetBrief, AuditCycleCreate, AuditCycleListResponse,
    AuditCycleResponse, AuditCycleUpdate, DiscrepancyReport,
    FindingResponse, RecordFindingRequest, UserBrief,
)


def _now(): return datetime.now(timezone.utc)


def _to_cycle_resp(c: AuditCycle) -> AuditCycleResponse:
    findings = c.findings or []
    disc = [f for f in findings if f.discrepancy_type != DiscrepancyType.NONE]
    return AuditCycleResponse(
        id=c.id, name=c.name, description=c.description,
        created_by=UserBrief.model_validate(c.created_by),
        status=c.status.value,
        scope_department_id=c.scope_department_id,
        scope_location=c.scope_location,
        scheduled_start=c.scheduled_start, scheduled_end=c.scheduled_end,
        actual_end=c.actual_end,
        auditor_ids=[a.user_id for a in (c.auditors or [])],
        total_findings=len(findings), discrepancy_count=len(disc),
        created_at=c.created_at, updated_at=c.updated_at,
    )


def _to_finding_resp(f: AuditFinding) -> FindingResponse:
    return FindingResponse(
        id=f.id, audit_cycle_id=f.audit_cycle_id,
        asset=AssetBrief(id=f.asset.id, asset_tag=f.asset.asset_tag,
                         name=f.asset.name, status=f.asset.status.value),
        auditor=UserBrief.model_validate(f.auditor) if f.auditor else None,
        expected_status=f.expected_status, observed_status=f.observed_status,
        discrepancy_type=f.discrepancy_type.value,
        notes=f.notes, resolved=f.resolved, created_at=f.created_at,
    )


def _load_cycle(db: Session, cycle_id: uuid.UUID) -> AuditCycle:
    c = db.query(AuditCycle).options(
        joinedload(AuditCycle.created_by),
        joinedload(AuditCycle.auditors).joinedload(AuditCycleAuditor.user),
        joinedload(AuditCycle.findings).joinedload(AuditFinding.asset),
        joinedload(AuditCycle.findings).joinedload(AuditFinding.auditor),
    ).filter(AuditCycle.id == cycle_id).first()
    if not c: raise NotFoundException("Audit cycle")
    return c


def list_cycles(db: Session, status_filter: Optional[str] = None,
                limit: int = 50, offset: int = 0) -> AuditCycleListResponse:
    q = db.query(AuditCycle).options(
        joinedload(AuditCycle.created_by),
        joinedload(AuditCycle.auditors),
        joinedload(AuditCycle.findings),
    )
    if status_filter: q = q.filter(AuditCycle.status == status_filter)
    total = q.count()
    items = q.order_by(AuditCycle.created_at.desc()).offset(offset).limit(limit).all()
    return AuditCycleListResponse(total=total, items=[_to_cycle_resp(c) for c in items])


def create_cycle(db: Session, payload: AuditCycleCreate, user: User) -> AuditCycleResponse:
    if payload.scheduled_end <= payload.scheduled_start:
        raise BadRequestException("End date must be after start date.")
    cycle = AuditCycle(
        id=uuid.uuid4(), name=payload.name, description=payload.description,
        created_by_id=user.id, status=AuditCycleStatus.PLANNED,
        scope_department_id=payload.scope_department_id,
        scope_location=payload.scope_location,
        scheduled_start=payload.scheduled_start, scheduled_end=payload.scheduled_end,
    )
    db.add(cycle)
    db.flush()
    for uid in payload.auditor_ids:
        db.add(AuditCycleAuditor(audit_cycle_id=cycle.id, user_id=uid))
    db.commit()
    return _to_cycle_resp(_load_cycle(db, cycle.id))


def start_cycle(db: Session, cycle_id: uuid.UUID, user: User) -> AuditCycleResponse:
    c = _load_cycle(db, cycle_id)
    if c.status != AuditCycleStatus.PLANNED:
        raise BadRequestException(f"Cycle is already {c.status.value}.")
    c.status = AuditCycleStatus.IN_PROGRESS
    db.commit()
    return _to_cycle_resp(_load_cycle(db, cycle_id))


def record_finding(db: Session, cycle_id: uuid.UUID,
                   payload: RecordFindingRequest, user: User) -> FindingResponse:
    c = _load_cycle(db, cycle_id)
    if c.status != AuditCycleStatus.IN_PROGRESS:
        raise BadRequestException("Cycle must be IN_PROGRESS to record findings.")

    # Check auditor is assigned
    auditor_ids = [a.user_id for a in c.auditors]
    if user.id not in auditor_ids and user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise ForbiddenException("You are not assigned as an auditor for this cycle.")

    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset: raise NotFoundException("Asset")

    disc_map = {
        "VERIFIED": DiscrepancyType.NONE,
        "MISSING": DiscrepancyType.MISSING,
        "DAMAGED": DiscrepancyType.DAMAGED,
    }
    disc_type = disc_map.get(payload.observed_status, DiscrepancyType.NONE)

    # Upsert — update if finding already exists for this asset in this cycle
    existing = db.query(AuditFinding).filter(
        AuditFinding.audit_cycle_id == cycle_id,
        AuditFinding.asset_id == payload.asset_id,
    ).first()

    if existing:
        existing.observed_status = payload.observed_status
        existing.discrepancy_type = disc_type
        existing.notes = payload.notes
        existing.auditor_id = user.id
        finding = existing
    else:
        finding = AuditFinding(
            id=uuid.uuid4(), audit_cycle_id=cycle_id,
            asset_id=payload.asset_id, auditor_id=user.id,
            expected_status=asset.status.value,
            observed_status=payload.observed_status,
            discrepancy_type=disc_type, notes=payload.notes,
        )
        db.add(finding)

    db.commit()
    db.refresh(finding)
    # reload with relationships
    f = db.query(AuditFinding).options(
        joinedload(AuditFinding.asset), joinedload(AuditFinding.auditor)
    ).filter(AuditFinding.id == finding.id).first()
    return _to_finding_resp(f)


def close_cycle(db: Session, cycle_id: uuid.UUID, user: User) -> AuditCycleResponse:
    c = _load_cycle(db, cycle_id)
    if c.status not in (AuditCycleStatus.PLANNED, AuditCycleStatus.IN_PROGRESS):
        raise BadRequestException(f"Cannot close cycle with status {c.status.value}.")

    # Auto-update asset statuses for discrepancies
    for finding in c.findings:
        if finding.observed_status == "MISSING" and not finding.resolved:
            asset = db.query(Asset).filter(Asset.id == finding.asset_id).first()
            if asset and asset.status != AssetStatus.LOST:
                old = asset.status
                asset.status = AssetStatus.LOST
                db.add(AssetStatusHistory(
                    id=uuid.uuid4(), asset_id=asset.id,
                    from_status=old, to_status=AssetStatus.LOST,
                    changed_by_id=user.id, reason=f"Audit cycle '{c.name}' — confirmed missing",
                ))
            finding.resolved = True

    c.status = AuditCycleStatus.COMPLETED
    c.actual_end = _now()
    db.commit()
    return _to_cycle_resp(_load_cycle(db, cycle_id))


def get_discrepancy_report(db: Session, cycle_id: uuid.UUID) -> DiscrepancyReport:
    c = _load_cycle(db, cycle_id)
    findings = c.findings or []
    disc_findings = [f for f in findings if f.discrepancy_type != DiscrepancyType.NONE]

    return DiscrepancyReport(
        audit_cycle_id=c.id, cycle_name=c.name, status=c.status.value,
        total_assets_audited=len(findings),
        verified=sum(1 for f in findings if f.observed_status == "VERIFIED"),
        missing=sum(1 for f in findings if f.observed_status == "MISSING"),
        damaged=sum(1 for f in findings if f.observed_status == "DAMAGED"),
        other=sum(1 for f in findings if f.observed_status not in ("VERIFIED", "MISSING", "DAMAGED")),
        findings=[_to_finding_resp(f) for f in disc_findings],
    )
