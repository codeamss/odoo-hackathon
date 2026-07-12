"""Reports & Analytics schemas."""
from pydantic import BaseModel
from typing import Optional


class AssetUtilizationItem(BaseModel):
    asset_id: str
    asset_tag: str
    asset_name: str
    category: Optional[str]
    department: Optional[str]
    allocation_count: int
    total_days_allocated: float
    status: str


class AssetUtilizationResponse(BaseModel):
    most_used: list[AssetUtilizationItem]
    idle: list[AssetUtilizationItem]


class MaintenanceFrequencyItem(BaseModel):
    asset_id: Optional[str]
    asset_tag: Optional[str]
    asset_name: Optional[str]
    category: Optional[str]
    total_requests: int
    completed: int
    avg_cost: Optional[float]


class MaintenanceFrequencyResponse(BaseModel):
    by_asset: list[MaintenanceFrequencyItem]
    by_category: list[MaintenanceFrequencyItem]


class AssetDueItem(BaseModel):
    asset_id: str
    asset_tag: str
    asset_name: str
    category: Optional[str]
    department: Optional[str]
    due_type: str          # "maintenance" | "warranty_expiry" | "retirement"
    due_date: Optional[str]
    days_until_due: Optional[int]
    status: str


class DeptAllocationItem(BaseModel):
    department_id: Optional[str]
    department_name: str
    total_allocations: int
    active_allocations: int
    overdue_allocations: int
    unique_assets: int


class BookingHeatmapSlot(BaseModel):
    hour: int          # 0–23
    day_of_week: int   # 0=Mon 6=Sun
    booking_count: int


class ReportsSummary(BaseModel):
    utilization: AssetUtilizationResponse
    maintenance_frequency: MaintenanceFrequencyResponse
    assets_due: list[AssetDueItem]
    dept_allocation: list[DeptAllocationItem]
    booking_heatmap: list[BookingHeatmapSlot]
