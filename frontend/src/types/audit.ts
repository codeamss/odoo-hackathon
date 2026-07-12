export type AuditCycleStatus = "PLANNED"|"IN_PROGRESS"|"COMPLETED"|"CANCELLED";

export interface UserBrief { id: string; full_name: string; email: string; }
export interface AssetBrief { id: string; asset_tag: string; name: string; status: string; }

export interface AuditCycle {
  id: string; name: string; description: string | null;
  created_by: UserBrief; status: AuditCycleStatus;
  scope_department_id: string | null; scope_location: string | null;
  scheduled_start: string; scheduled_end: string; actual_end: string | null;
  auditor_ids: string[]; total_findings: number; discrepancy_count: number;
  created_at: string; updated_at: string;
}

export interface AuditCycleListResponse { total: number; items: AuditCycle[]; }

export interface FindingResponse {
  id: string; audit_cycle_id: string;
  asset: AssetBrief; auditor: UserBrief | null;
  expected_status: string | null; observed_status: string | null;
  discrepancy_type: string; notes: string | null; resolved: boolean; created_at: string;
}

export interface DiscrepancyReport {
  audit_cycle_id: string; cycle_name: string; status: string;
  total_assets_audited: number; verified: number; missing: number; damaged: number; other: number;
  findings: FindingResponse[];
}
