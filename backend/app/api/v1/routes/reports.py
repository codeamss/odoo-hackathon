"""Reports & Analytics router."""
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import csv, io

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.reports import (
    AssetUtilizationResponse, DeptAllocationItem,
    MaintenanceFrequencyResponse, ReportsSummary,
)
from app.services import reports_service

router = APIRouter(prefix="/reports", tags=["Reports"])
ManagerUp = Annotated[User, Depends(require_roles(
    UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AUDITOR
))]


@router.get("/summary", response_model=ReportsSummary)
def get_summary(current_user: ManagerUp, db: Annotated[Session, Depends(get_db)]) -> ReportsSummary:
    return reports_service.get_full_summary(db)


@router.get("/utilization", response_model=AssetUtilizationResponse)
def get_utilization(
    current_user: ManagerUp, db: Annotated[Session, Depends(get_db)],
    top_n: int = Query(default=10, ge=1, le=50),
) -> AssetUtilizationResponse:
    return reports_service.get_utilization(db, top_n)


@router.get("/maintenance-frequency", response_model=MaintenanceFrequencyResponse)
def get_maintenance_frequency(
    current_user: ManagerUp, db: Annotated[Session, Depends(get_db)],
) -> MaintenanceFrequencyResponse:
    return reports_service.get_maintenance_frequency(db)


@router.get("/dept-allocation", response_model=list[DeptAllocationItem])
def get_dept_allocation(
    current_user: ManagerUp, db: Annotated[Session, Depends(get_db)],
) -> list[DeptAllocationItem]:
    return reports_service.get_dept_allocation_summary(db)


@router.get("/export/utilization")
def export_utilization_csv(
    current_user: ManagerUp, db: Annotated[Session, Depends(get_db)],
) -> StreamingResponse:
    """Export asset utilization as CSV."""
    data = reports_service.get_utilization(db, top_n=500)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Asset Tag","Name","Category","Department","Allocation Count","Days Allocated","Status"])
    for item in data.most_used + data.idle:
        writer.writerow([item.asset_tag, item.asset_name, item.category or "", item.department or "",
                         item.allocation_count, item.total_days_allocated, item.status])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=utilization.csv"},
    )


@router.get("/export/dept-allocation")
def export_dept_csv(
    current_user: ManagerUp, db: Annotated[Session, Depends(get_db)],
) -> StreamingResponse:
    """Export department allocation summary as CSV."""
    data = reports_service.get_dept_allocation_summary(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Department","Total Allocations","Active","Overdue","Unique Assets"])
    for item in data:
        writer.writerow([item.department_name, item.total_allocations,
                         item.active_allocations, item.overdue_allocations, item.unique_assets])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=dept_allocation.csv"},
    )
