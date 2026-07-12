export type AssetStatus =
  | "AVAILABLE" | "ALLOCATED" | "RESERVED"
  | "UNDER_MAINTENANCE" | "LOST" | "RETIRED" | "DISPOSED";

export interface CategoryInfo { id: string; name: string; }
export interface DeptInfo { id: string; name: string; }

export interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  description: string | null;
  serial_number: string | null;
  location: string | null;
  condition: string | null;
  category_id: string | null;
  category: CategoryInfo | null;
  department_id: string | null;
  department: DeptInfo | null;
  status: AssetStatus;
  purchase_date: string | null;
  purchase_cost: number | null;
  current_value: number | null;
  warranty_expiry_date: string | null;
  is_bookable: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetListResponse { total: number; items: Asset[]; }

export interface AssetCreatePayload {
  name: string;
  description?: string;
  category_id?: string;
  department_id?: string;
  serial_number?: string;
  location?: string;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  warranty_expiry_date?: string;
  is_bookable?: boolean;
  condition?: string;
}

export interface StatusHistoryEntry {
  id: string;
  from_status: AssetStatus | null;
  to_status: AssetStatus;
  changed_by_name: string | null;
  reason: string | null;
  changed_at: string;
}

export interface AllocationHistoryEntry {
  id: string;
  allocated_to: string;
  allocated_to_type: string;
  allocated_by_name: string;
  status: string;
  allocated_at: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  notes: string | null;
}

export interface MaintenanceHistoryEntry {
  id: string;
  status: string;
  priority: string;
  description: string;
  requested_by_name: string;
  submitted_at: string | null;
  completed_at: string | null;
  actual_cost: number | null;
}

export interface AssetHistoryResponse {
  asset_id: string;
  asset_tag: string;
  status_history: StatusHistoryEntry[];
  allocation_history: AllocationHistoryEntry[];
  maintenance_history: MaintenanceHistoryEntry[];
}

export interface AssetFilters {
  search?: string;
  status?: AssetStatus;
  category_id?: string;
  department_id?: string;
  location?: string;
  is_bookable?: boolean;
  limit?: number;
  offset?: number;
}
