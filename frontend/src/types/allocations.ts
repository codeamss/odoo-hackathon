export type AllocationStatus = "ACTIVE" | "RETURNED" | "REVOKED";
export type TransferStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";

export interface AssetBrief { id: string; asset_tag: string; name: string; status: string; }
export interface UserBrief { id: string; full_name: string; email: string; }
export interface DeptBrief { id: string; name: string; }

export interface Allocation {
  id: string;
  asset_id: string;
  asset: AssetBrief;
  allocated_to_user_id: string | null;
  allocated_to_user: UserBrief | null;
  allocated_to_dept_id: string | null;
  allocated_to_dept: DeptBrief | null;
  allocated_by_id: string;
  allocated_by: UserBrief;
  status: AllocationStatus;
  allocated_at: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  notes: string | null;
  is_overdue: boolean;
}

export interface AllocationListResponse { total: number; items: Allocation[]; }

export interface ConflictInfo {
  is_conflict: boolean;
  current_holder: string | null;
  allocation_id: string | null;
  allocated_at: string | null;
}

export interface TransferRequest {
  id: string;
  asset_id: string;
  asset: AssetBrief;
  requested_by: UserBrief;
  requested_for_user: UserBrief | null;
  requested_for_dept: DeptBrief | null;
  reviewed_by: UserBrief | null;
  status: TransferStatus;
  reason: string | null;
  review_notes: string | null;
  expected_return_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransferListResponse { total: number; items: TransferRequest[]; }
