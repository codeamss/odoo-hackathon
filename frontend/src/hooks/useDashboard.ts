/**
 * TanStack Query hooks for all dashboard API endpoints.
 * Auto-refresh every 60 seconds to keep KPIs current.
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import type {
  ActiveBookingsResponse,
  KPICards,
  MaintenanceActivityResponse,
  OverdueReturnsResponse,
  UpcomingReturnsResponse,
} from "@/types/dashboard";

const REFETCH_INTERVAL = 60_000; // 60 s

// ── Query keys ─────────────────────────────────────────────────────────────────
export const dashboardKeys = {
  all: ["dashboard"] as const,
  kpis: () => [...dashboardKeys.all, "kpis"] as const,
  overdueReturns: (limit?: number, offset?: number) =>
    [...dashboardKeys.all, "overdue-returns", limit, offset] as const,
  upcomingReturns: (daysAhead?: number, limit?: number, offset?: number) =>
    [...dashboardKeys.all, "upcoming-returns", daysAhead, limit, offset] as const,
  maintenanceActivity: (limit?: number) =>
    [...dashboardKeys.all, "maintenance-activity", limit] as const,
  activeBookings: (limit?: number) =>
    [...dashboardKeys.all, "active-bookings", limit] as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useKPICards() {
  return useQuery<KPICards>({
    queryKey: dashboardKeys.kpis(),
    queryFn: async () => {
      const { data } = await apiClient.get<KPICards>("/dashboard/kpis");
      return data;
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 30_000,
  });
}

export function useOverdueReturns(limit = 10, offset = 0) {
  return useQuery<OverdueReturnsResponse>({
    queryKey: dashboardKeys.overdueReturns(limit, offset),
    queryFn: async () => {
      const { data } = await apiClient.get<OverdueReturnsResponse>(
        "/dashboard/overdue-returns",
        { params: { limit, offset } }
      );
      return data;
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 30_000,
  });
}

export function useUpcomingReturns(daysAhead = 7, limit = 10, offset = 0) {
  return useQuery<UpcomingReturnsResponse>({
    queryKey: dashboardKeys.upcomingReturns(daysAhead, limit, offset),
    queryFn: async () => {
      const { data } = await apiClient.get<UpcomingReturnsResponse>(
        "/dashboard/upcoming-returns",
        { params: { days_ahead: daysAhead, limit, offset } }
      );
      return data;
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 30_000,
  });
}

export function useMaintenanceActivity(limit = 8) {
  return useQuery<MaintenanceActivityResponse>({
    queryKey: dashboardKeys.maintenanceActivity(limit),
    queryFn: async () => {
      const { data } = await apiClient.get<MaintenanceActivityResponse>(
        "/dashboard/maintenance-activity",
        { params: { limit } }
      );
      return data;
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 30_000,
  });
}

export function useActiveBookings(limit = 8) {
  return useQuery<ActiveBookingsResponse>({
    queryKey: dashboardKeys.activeBookings(limit),
    queryFn: async () => {
      const { data } = await apiClient.get<ActiveBookingsResponse>(
        "/dashboard/active-bookings",
        { params: { limit } }
      );
      return data;
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 30_000,
  });
}
