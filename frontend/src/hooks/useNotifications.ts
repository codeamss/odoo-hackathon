import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import type { ActivityLogListResponse, NotificationListResponse } from "@/types/notifications";

export function useNotifications(params?: { unread_only?: boolean; limit?: number }) {
  return useQuery<NotificationListResponse>({
    queryKey: ["notifications", params],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationListResponse>("/notifications", { params });
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => { await apiClient.post("/notifications/mark-read"); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkOneRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => { await apiClient.post(`/notifications/${id}/mark-read`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useActivityLogs(params?: { action?: string; entity_type?: string; limit?: number }) {
  return useQuery<ActivityLogListResponse>({
    queryKey: ["activity-logs", params],
    queryFn: async () => {
      const { data } = await apiClient.get<ActivityLogListResponse>("/activity-logs", { params });
      return data;
    },
  });
}
