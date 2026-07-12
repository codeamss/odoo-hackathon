import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaintenanceActivityItem } from "@/types/dashboard";

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-purple-100 text-purple-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  REJECTED: "bg-red-100 text-red-700",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-500",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface MaintenanceActivityProps {
  items: MaintenanceActivityItem[];
  total: number;
  isLoading?: boolean;
}

export function MaintenanceActivity({
  items,
  total,
  isLoading = false,
}: MaintenanceActivityProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            Maintenance Activity
          </h2>
          {total > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {total}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">Recent</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-5 py-3.5">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              </div>
            </li>
          ))
        ) : items.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-slate-400">
            No active maintenance requests.
          </li>
        ) : (
          items.map((item) => (
            <li
              key={item.request_id}
              className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-900 truncate">
                    {item.asset_name}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    {item.asset_tag}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_STYLES[item.status] ?? "bg-slate-100 text-slate-600"
                    )}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      PRIORITY_STYLES[item.priority] ?? "bg-slate-100 text-slate-500"
                    )}
                  >
                    {item.priority}
                  </span>
                  <span className="text-xs text-slate-400">
                    by {item.requested_by}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {formatTimeAgo(item.created_at)}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
