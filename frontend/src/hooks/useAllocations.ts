import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import type {
  Allocation, AllocationListResponse, ConflictInfo,
  TransferListResponse, TransferRequest,
} from "@/types/allocations";

export function useAllocations(params?: { status?: string; overdue_only?: boolean }) {
  return useQuery<AllocationListResponse>({
    queryKey: ["allocations", params],
    queryFn: async () => {
      const { data } = await apiClient.get<AllocationListResponse>("/allocations", { params });
      return data;
    },
  });
}

export function useConflictCheck(assetId: string | null) {
  return useQuery<ConflictInfo>({
    queryKey: ["conflict-check", assetId],
    queryFn: async () => {
      const { data } = await apiClient.get<ConflictInfo>("/allocations/conflict-check", { params: { asset_id: assetId } });
      return data;
    },
    enabled: !!assetId,
  });
}

export function useAllocate() {
  const qc = useQueryClient();
  return useMutation<Allocation, Error, { asset_id: string; allocated_to_user_id?: string; allocated_to_dept_id?: string; expected_return_date?: string; notes?: string }>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Allocation>("/allocations", payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["allocations"] }); qc.invalidateQueries({ queryKey: ["assets"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}

export function useReturnAsset() {
  const qc = useQueryClient();
  return useMutation<Allocation, Error, { alloc_id: string; condition_notes?: string }>({
    mutationFn: async ({ alloc_id, condition_notes }) => {
      const { data } = await apiClient.post<Allocation>(`/allocations/${alloc_id}/return`, { condition_notes });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["allocations"] }); qc.invalidateQueries({ queryKey: ["assets"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}

export function useTransfers(params?: { status?: string }) {
  return useQuery<TransferListResponse>({
    queryKey: ["transfers", params],
    queryFn: async () => {
      const { data } = await apiClient.get<TransferListResponse>("/allocations/transfers", { params });
      return data;
    },
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation<TransferRequest, Error, { asset_id: string; requested_for_user_id?: string; requested_for_dept_id?: string; reason?: string; expected_return_date?: string }>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<TransferRequest>("/allocations/transfers", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transfers"] }),
  });
}

export function useReviewTransfer() {
  const qc = useQueryClient();
  return useMutation<TransferRequest, Error, { id: string; approved: boolean; review_notes?: string }>({
    mutationFn: async ({ id, approved, review_notes }) => {
      const { data } = await apiClient.post<TransferRequest>(`/allocations/transfers/${id}/review`, { approved, review_notes });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transfers"] }); qc.invalidateQueries({ queryKey: ["allocations"] }); qc.invalidateQueries({ queryKey: ["assets"] }); },
  });
}
