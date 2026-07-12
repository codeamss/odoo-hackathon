import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import type {
  AssetCategory,
  AssetCategoryListResponse,
  AssetCategoryPayload,
  Department,
  DepartmentCreatePayload,
  DepartmentListResponse,
  DepartmentUpdatePayload,
  Employee,
  EmployeeListResponse,
} from "@/types/organization";

// ── Query keys ────────────────────────────────────────────────────────────────
export const orgKeys = {
  departments: (params?: object) => ["departments", params] as const,
  department: (id: string) => ["departments", id] as const,
  categories: (params?: object) => ["asset-categories", params] as const,
  category: (id: string) => ["asset-categories", id] as const,
  employees: (params?: object) => ["users", params] as const,
  employee: (id: string) => ["users", id] as const,
};

// ── Departments ───────────────────────────────────────────────────────────────
export function useDepartments(params?: { include_inactive?: boolean; search?: string }) {
  return useQuery<DepartmentListResponse>({
    queryKey: orgKeys.departments(params),
    queryFn: async () => {
      const { data } = await apiClient.get<DepartmentListResponse>("/departments", { params });
      return data;
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation<Department, Error, DepartmentCreatePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Department>("/departments", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation<Department, Error, { id: string; payload: DepartmentUpdatePayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<Department>(`/departments/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useDeactivateDepartment() {
  const qc = useQueryClient();
  return useMutation<Department, Error, string>({
    mutationFn: async (id) => {
      const { data } = await apiClient.post<Department>(`/departments/${id}/deactivate`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useAssignDeptHead() {
  const qc = useQueryClient();
  return useMutation<Department, Error, { deptId: string; managerId: string }>({
    mutationFn: async ({ deptId, managerId }) => {
      const { data } = await apiClient.post<Department>(
        `/departments/${deptId}/assign-head`,
        { manager_id: managerId }
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

// ── Asset Categories ──────────────────────────────────────────────────────────
export function useAssetCategories(params?: { include_inactive?: boolean; search?: string }) {
  return useQuery<AssetCategoryListResponse>({
    queryKey: orgKeys.categories(params),
    queryFn: async () => {
      const { data } = await apiClient.get<AssetCategoryListResponse>("/asset-categories", { params });
      return data;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation<AssetCategory, Error, AssetCategoryPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<AssetCategory>("/asset-categories", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["asset-categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation<AssetCategory, Error, { id: string; payload: Partial<AssetCategoryPayload> }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<AssetCategory>(`/asset-categories/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["asset-categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => { await apiClient.delete(`/asset-categories/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["asset-categories"] }),
  });
}

// ── Employees ─────────────────────────────────────────────────────────────────
export function useEmployees(params?: {
  role?: string;
  department_id?: string;
  include_inactive?: boolean;
  search?: string;
}) {
  return useQuery<EmployeeListResponse>({
    queryKey: orgKeys.employees(params),
    queryFn: async () => {
      const { data } = await apiClient.get<EmployeeListResponse>("/users", { params });
      return data;
    },
  });
}

export function useUpdateEmployeeRole() {
  const qc = useQueryClient();
  return useMutation<Employee, Error, { id: string; role: string }>({
    mutationFn: async ({ id, role }) => {
      const { data } = await apiClient.patch<Employee>(`/users/${id}/role`, { role });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation<Employee, Error, { id: string; payload: { is_active?: boolean; department_id?: string; full_name?: string } }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<Employee>(`/users/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
