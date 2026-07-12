import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveBookingItem } from "@/types/dashboard";

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface ActiveBookingsProps {
  items: ActiveBookingItem[];
  total: number;
  isLoading?: boolean;
}

export function ActiveBookings({
  items,
  total,
  isLoading = false,
}: ActiveBookingsProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            Active Bookings
          </h2>
          {total > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {total}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">Current & upcoming</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-5 py-3.5">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
              </div>
            </li>
          ))
        ) : items.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-slate-400">
            No active or upcoming bookings.
          </li>
        ) : (
          items.map((item) => (
            <li
              key={item.booking_id}
              className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-900 truncate">
                    {item.asset_name}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    {item.asset_tag}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_STYLES[item.status] ?? "bg-slate-100 text-slate-500"
                    )}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">
                    {item.booked_by}
                  </span>
                  {" · "}
                  {formatDateTime(item.start_time)} →{" "}
                  {formatDateTime(item.end_time)}
                </div>
                {item.purpose && (
                  <div className="mt-0.5 truncate text-xs text-slate-400">
                    {item.purpose}
                  </div>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
