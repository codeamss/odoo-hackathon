import { X, Clock, Wrench, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAssetHistory } from "@/hooks/useAssets";

const STATUS_COLORS: Record<string, "green" | "red" | "amber" | "blue" | "purple" | "slate"> = {
  AVAILABLE: "green", ALLOCATED: "blue", RESERVED: "purple",
  UNDER_MAINTENANCE: "amber", LOST: "red", RETIRED: "slate", DISPOSED: "slate",
  ACTIVE: "blue", RETURNED: "green", REVOKED: "red",
  SUBMITTED: "blue", APPROVED: "green", IN_PROGRESS: "amber",
  COMPLETED: "green", REJECTED: "red", CANCELLED: "slate",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  assetId: string | null;
  assetTag: string;
  onClose: () => void;
}

export function AssetHistoryDrawer({ assetId, assetTag, onClose }: Props) {
  const { data, isLoading } = useAssetHistory(assetId);

  return (
    <div className={`fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-lg bg-white shadow-2xl transform transition-transform duration-200 ${assetId ? "translate-x-0" : "translate-x-full"}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Asset History</h2>
          <p className="text-sm text-slate-500">{assetTag}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : !data ? null : (
          <>
            {/* Status History */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock className="h-4 w-4" /> Status History
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{data.status_history.length}</span>
              </h3>
              {data.status_history.length === 0 ? (
                <p className="text-sm text-slate-400">No status changes recorded.</p>
              ) : (
                <div className="space-y-2">
                  {data.status_history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {h.from_status && (
                            <>
                              <Badge variant={STATUS_COLORS[h.from_status] ?? "slate"}>{h.from_status}</Badge>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            </>
                          )}
                          <Badge variant={STATUS_COLORS[h.to_status] ?? "slate"}>{h.to_status}</Badge>
                        </div>
                        {h.reason && <p className="mt-1 text-xs text-slate-500">{h.reason}</p>}
                        <p className="mt-1 text-xs text-slate-400">{h.changed_by_name ?? "System"} · {fmt(h.changed_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Allocation History */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ChevronRight className="h-4 w-4" /> Allocation History
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{data.allocation_history.length}</span>
              </h3>
              {data.allocation_history.length === 0 ? (
                <p className="text-sm text-slate-400">No allocations yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.allocation_history.map((a) => (
                    <div key={a.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-slate-900">{a.allocated_to}</span>
                        <Badge variant={STATUS_COLORS[a.status] ?? "slate"}>{a.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">By {a.allocated_by_name} · {fmt(a.allocated_at)}</p>
                      {a.expected_return_date && (
                        <p className="text-xs text-slate-400">Due: {fmt(a.expected_return_date)}</p>
                      )}
                      {a.notes && <p className="text-xs text-slate-400 mt-1">{a.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Maintenance History */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Wrench className="h-4 w-4" /> Maintenance History
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{data.maintenance_history.length}</span>
              </h3>
              {data.maintenance_history.length === 0 ? (
                <p className="text-sm text-slate-400">No maintenance requests.</p>
              ) : (
                <div className="space-y-2">
                  {data.maintenance_history.map((m) => (
                    <div key={m.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 truncate">{m.description}</span>
                        <div className="flex gap-1.5">
                          <Badge variant={STATUS_COLORS[m.status] ?? "slate"}>{m.status}</Badge>
                          <Badge variant={m.priority === "CRITICAL" ? "red" : m.priority === "HIGH" ? "amber" : "slate"}>{m.priority}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">By {m.requested_by_name}{m.actual_cost != null ? ` · Cost: $${m.actual_cost}` : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
