export type MaintenanceStatus = "DRAFT"|"SUBMITTED"|"UNDER_REVIEW"|"APPROVED"|"IN_PROGRESS"|"COMPLETED"|"REJECTED"|"CANCELLED";
export type MaintenancePriority = "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";

export interface AssetBrief { id: string; asset_tag: string; name: string; }
export interface UserBrief { id: string; full_name: string; email: string; }

export interface MaintenanceRequest {
  id: string; asset_id: string; asset: AssetBrief;
  requested_by: UserBrief; assigned_to: UserBrief | null; approved_by: UserBrief | null;
  status: MaintenanceStatus; priority: MaintenancePriority; description: string;
  estimated_cost: number | null; actual_cost: number | null;
  submitted_at: string | null; approved_at: string | null; completed_at: string | null;
  created_at: string; updated_at: string;
  allowed_actions: string[];
}

export interface MaintenanceListResponse { total: number; items: MaintenanceRequest[]; }
