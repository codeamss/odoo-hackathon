import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import type {
  Asset, AssetCreatePayload, AssetFilters,
  AssetHistoryResponse, AssetListResponse, AssetStatus,
} from "@/types/assets";

export const assetKeys = {
  list: (f?: AssetFilters) => ["assets", f] as const,
  detail: (id: string) => ["assets", id] as const,
  history: (id: string) => ["assets", id, "history"] as const,
};

export function useAssets(filters?: AssetFilters) {
  return useQuery<AssetListResponse>({
    queryKey: assetKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string | boolean | number> = {};
      if (filters?.search) params.search = filters.search;
      if (filters?.status) params.status = filters.status;
      if (filters?.category_id) params.category_id = filters.category_id;
      if (filters?.department_id) params.department_id = filters.department_id;
      if (filters?.location) params.location = filters.location;
      if (filters?.is_bookable !== undefined) params.is_bookable = filters.is_bookable;
      if (filters?.limit) params.limit = filters.limit;
      if (filters?.offset) params.offset = filters.offset ?? 0;
      const { data } = await apiClient.get<AssetListResponse>("/assets", { params });
      return data;
    },
  });
}

export function useAssetHistory(assetId: string | null) {
  return useQuery<AssetHistoryResponse>({
    queryKey: assetKeys.history(assetId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<AssetHistoryResponse>(`/assets/${assetId}/history`);
      return data;
    },
    enabled: !!assetId,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation<Asset, Error, AssetCreatePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Asset>("/assets", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation<Asset, Error, { id: string; payload: Partial<AssetCreatePayload> }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<Asset>(`/assets/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}

export function useUpdateAssetStatus() {
  const qc = useQueryClient();
  return useMutation<Asset, Error, { id: string; status: AssetStatus; reason?: string }>({
    mutationFn: async ({ id, status, reason }) => {
      const { data } = await apiClient.patch<Asset>(`/assets/${id}/status`, { status, reason });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}
