/**
 * ReturnsTable — shared table for both overdue and upcoming returns.
 * Mode is controlled by the `variant` prop.
 */
import { AlertTriangle, Clock, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReturnItem } from "@/types/dashboard";

interface ReturnsTableProps {
  variant: "overdue" | "upcoming";
  items: ReturnItem[];
  total: number;
  isLoading?: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 animate-pulse rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  );
}

export function ReturnsTable({
  variant,
  items,
  total,
  isLoading = false,
}: ReturnsTableProps) {
  const isOverdue = variant === "overdue";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          {isOverdue ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : (
            <Clock className="h-4 w-4 text-amber-500" />
          )}
          <h2 className="text-sm font-semibold text-slate-900">
            {isOverdue ? "Overdue Returns" : "Upcoming Returns"}
          </h2>
          {total > 0 && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                isOverdue
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
              )}
            >
              {total}
            </span>
          )}
        </div>
        {!isOverdue && (
          <span className="text-xs text-slate-400">Next 7 days</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Asset
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Assigned To
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isOverdue ? "Was Due" : "Due Date"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isOverdue ? "Days Overdue" : "Days Left"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  {isOverdue
                    ? "No overdue returns. All assets accounted for."
                    : "No returns due in the next 7 days."}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const daysLeft = item.days_overdue === null
                  ? Math.ceil(
                      (new Date(item.expected_return_date).getTime() -
                        Date.now()) /
                        86_400_000
                    )
                  : null;

                return (
                  <tr
                    key={item.allocation_id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    {/* Asset */}
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-slate-900">
                          {item.asset_name}
                        </span>
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          {item.asset_tag}
                        </span>
                      </div>
                      {item.department_name && (
                        <div className="mt-0.5 text-xs text-slate-400">
                          {item.department_name}
                        </div>
                      )}
                    </td>

                    {/* Assigned to */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        {item.allocated_to_type === "user" ? (
                          <User className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        {item.allocated_to}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-slate-500">
                      {item.category_name ?? "—"}
                    </td>

                    {/* Due date */}
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(item.expected_return_date)}
                    </td>

                    {/* Days overdue / left */}
                    <td className="px-4 py-3">
                      {isOverdue && item.days_overdue !== null ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          {item.days_overdue}d overdue
                        </span>
                      ) : daysLeft !== null ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            daysLeft <= 1
                              ? "bg-red-100 text-red-700"
                              : daysLeft <= 3
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          )}
                        >
                          {daysLeft}d left
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer — show count if truncated */}
      {total > items.length && (
        <div className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-400">
          Showing {items.length} of {total} —{" "}
          <button className="text-blue-600 hover:underline">View all</button>
        </div>
      )}
    </div>
  );
}
