import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import type { ReportsSummary } from "@/types/reports";

export function useReportsSummary() {
  return useQuery<ReportsSummary>({
    queryKey: ["reports-summary"],
    queryFn: async () => {
      const { data } = await apiClient.get<ReportsSummary>("/reports/summary");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function exportCsv(endpoint: "utilization" | "dept-allocation") {
  const token = localStorage.getItem("af_access_token");
  const a = document.createElement("a");
  a.href = `/api/v1/reports/export/${endpoint}`;
  // Add auth via fetch + blob
  fetch(a.href, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `${endpoint}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
}
