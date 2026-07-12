import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import type { AuditCycle, AuditCycleListResponse, DiscrepancyReport, FindingResponse } from "@/types/audit";

export function useAuditCycles(params?: { status?: string }) {
  return useQuery<AuditCycleListResponse>({
    queryKey: ["audit", params],
    queryFn: async () => { const { data } = await apiClient.get<AuditCycleListResponse>("/audit", { params }); return data; },
  });
}

export function useDiscrepancyReport(cycleId: string | null) {
  return useQuery<DiscrepancyReport>({
    queryKey: ["audit-report", cycleId],
    queryFn: async () => { const { data } = await apiClient.get<DiscrepancyReport>(`/audit/${cycleId}/report`); return data; },
    enabled: !!cycleId,
  });
}

export function useCreateCycle() {
  const qc = useQueryClient();
  return useMutation<AuditCycle, Error, { name: string; description?: string; scope_department_id?: string; scope_location?: string; scheduled_start: string; scheduled_end: string; auditor_ids: string[] }>({
    mutationFn: async (p) => { const { data } = await apiClient.post<AuditCycle>("/audit", p); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }),
  });
}

export function useStartCycle() {
  const qc = useQueryClient();
  return useMutation<AuditCycle, Error, string>({
    mutationFn: async (id) => { const { data } = await apiClient.post<AuditCycle>(`/audit/${id}/start`); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }),
  });
}

export function useCloseCycle() {
  const qc = useQueryClient();
  return useMutation<AuditCycle, Error, string>({
    mutationFn: async (id) => { const { data } = await apiClient.post<AuditCycle>(`/audit/${id}/close`); return data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["audit"] }); qc.invalidateQueries({ queryKey: ["assets"] }); },
  });
}

export function useRecordFinding() {
  const qc = useQueryClient();
  return useMutation<FindingResponse, Error, { cycleId: string; asset_id: string; observed_status: string; discrepancy_type?: string; notes?: string }>({
    mutationFn: async ({ cycleId, ...payload }) => {
      const { data } = await apiClient.post<FindingResponse>(`/audit/${cycleId}/findings`, payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["audit"] }); qc.invalidateQueries({ queryKey: ["audit-report"] }); },
  });
}
