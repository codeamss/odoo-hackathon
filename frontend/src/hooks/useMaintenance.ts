import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import type { MaintenanceListResponse, MaintenanceRequest } from "@/types/maintenance";

export function useMaintenance(params?: { status?: string; my_only?: boolean }) {
  return useQuery<MaintenanceListResponse>({
    queryKey: ["maintenance", params],
    queryFn: async () => {
      const { data } = await apiClient.get<MaintenanceListResponse>("/maintenance", { params });
      return data;
    },
  });
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation<MaintenanceRequest, Error, { asset_id: string; description: string; priority: string }>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<MaintenanceRequest>("/maintenance", payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance"] }); qc.invalidateQueries({ queryKey: ["assets"] }); },
  });
}

export function useMaintenanceAction() {
  const qc = useQueryClient();
  return useMutation<MaintenanceRequest, Error, { id: string; action: string; assigned_to_id?: string; actual_cost?: number; estimated_cost?: number; notes?: string }>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await apiClient.post<MaintenanceRequest>(`/maintenance/${id}/action`, payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance"] }); qc.invalidateQueries({ queryKey: ["assets"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}
