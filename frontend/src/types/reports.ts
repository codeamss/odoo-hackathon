export interface AssetUtilizationItem {
  asset_id: string; asset_tag: string; asset_name: string;
  category: string | null; department: string | null;
  allocation_count: number; total_days_allocated: number; status: string;
}
export interface AssetUtilizationResponse { most_used: AssetUtilizationItem[]; idle: AssetUtilizationItem[]; }

export interface MaintenanceFrequencyItem {
  asset_id: string | null; asset_tag: string | null; asset_name: string | null;
  category: string | null; total_requests: number; completed: number; avg_cost: number | null;
}
export interface MaintenanceFrequencyResponse { by_asset: MaintenanceFrequencyItem[]; by_category: MaintenanceFrequencyItem[]; }

export interface AssetDueItem {
  asset_id: string; asset_tag: string; asset_name: string;
  category: string | null; department: string | null;
  due_type: string; due_date: string | null; days_until_due: number | null; status: string;
}

export interface DeptAllocationItem {
  department_id: string | null; department_name: string;
  total_allocations: number; active_allocations: number;
  overdue_allocations: number; unique_assets: number;
}

export interface BookingHeatmapSlot { hour: number; day_of_week: number; booking_count: number; }

export interface ReportsSummary {
  utilization: AssetUtilizationResponse;
  maintenance_frequency: MaintenanceFrequencyResponse;
  assets_due: AssetDueItem[];
  dept_allocation: DeptAllocationItem[];
  booking_heatmap: BookingHeatmapSlot[];
}
