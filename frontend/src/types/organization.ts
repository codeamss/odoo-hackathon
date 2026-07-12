import type { UserRole } from "./auth";

// ── Departments ───────────────────────────────────────────────────────────────
export interface ManagerInfo { id: string; full_name: string; email: string; }
export interface ParentDeptInfo { id: string; name: string; }

export interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  manager: ManagerInfo | null;
  parent_dept_id: string | null;
  parent: ParentDeptInfo | null;
  is_active: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentListResponse { total: number; items: Department[]; }

export interface DepartmentCreatePayload {
  name: string;
  description?: string;
  manager_id?: string;
  parent_dept_id?: string;
}

export interface DepartmentUpdatePayload {
  name?: string;
  description?: string;
  manager_id?: string;
  parent_dept_id?: string;
  is_active?: boolean;
}

// ── Asset Categories ──────────────────────────────────────────────────────────
export interface AssetCategory {
  id: string;
  name: string;
  description: string | null;
  depreciation_rate: number | null;
  useful_life_years: number | null;
  warranty_period_months: number | null;
  requires_maintenance: boolean;
  maintenance_interval_days: number | null;
  is_active: boolean;
  asset_count: number;
  created_at: string;
  updated_at: string;
}

export interface AssetCategoryListResponse { total: number; items: AssetCategory[]; }

export interface AssetCategoryPayload {
  name: string;
  description?: string;
  depreciation_rate?: number;
  useful_life_years?: number;
  warranty_period_months?: number;
  requires_maintenance?: boolean;
  maintenance_interval_days?: number;
  is_active?: boolean;
}

// ── Users / Employees ─────────────────────────────────────────────────────────
export interface DeptInfo { id: string; name: string; }

export interface Employee {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  department: DeptInfo | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeListResponse { total: number; items: Employee[]; }
