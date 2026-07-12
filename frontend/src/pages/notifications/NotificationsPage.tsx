import { useState } from "react";
import { Bell, CheckCheck, Activity, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNotifications, useMarkAllRead, useMarkOneRead, useActivityLogs } from "@/hooks/useNotifications";
import { useAuthStore } from "@/stores/authStore";

const NOTIF_ICON: Record<string, string> = {
  OVERDUE_RETURN: "🔴", BOOKING_REMINDER: "📅", MAINTENANCE_UPDATE: "🔧",
  AUDIT_ASSIGNED: "📋", ALLOCATION_UPDATE: "📦", SYSTEM_ALERT: "⚠️",
};

const TABS = [
  { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { key: "activity", label: "Activity Log", icon: <Activity className="h-4 w-4" /> },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("notifications");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [actionFilter, setActionFilter] = useState("");

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "AUDITOR";

  const { data: notifData, isLoading: notifLoading } = useNotifications({ unread_only: unreadOnly, limit: 100 });
  const { data: logData, isLoading: logLoading } = useActivityLogs(
    tab === "activity" ? { action: actionFilter || undefined, limit: 200 } : undefined
  );

  const markAllMut = useMarkAllRead();
  const markOneMut = useMarkOneRead();

  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count: t.key === "notifications" ? (notifData?.unread_count ?? 0) || undefined : undefined,
  }));

  return (
    <AppShell title="Notifications">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Activity & Notifications</h2>
          <p className="mt-1 text-sm text-slate-500">Stay informed about asset activity and system events.</p>
        </div>
        {tab === "notifications" && (notifData?.unread_count ?? 0) > 0 && (
          <Button size="sm" variant="outline" onClick={() => markAllMut.mutate()} isLoading={markAllMut.isPending}>
            <CheckCheck className="h-4 w-4 mr-1" />Mark All Read
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Tabs tabs={tabsWithCounts} active={tab} onChange={setTab} />
        <div className="p-5">

          {/* ── NOTIFICATIONS TAB ── */}
          {tab === "notifications" && (
            <>
              <div className="mb-4 flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="rounded" />
                  Unread only
                </label>
                {notifData && (
                  <span className="text-xs text-slate-400">
                    {notifData.unread_count} unread of {notifData.total}
                  </span>
                )}
              </div>

              {notifLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}
                </div>
              ) : !notifData?.items.length ? (
                <EmptyState
                  icon={<Bell className="h-12 w-12" />}
                  title="No notifications"
                  description={unreadOnly ? "You have no unread notifications." : "You have no notifications yet."}
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {notifData.items.map((n) => (
                    <li
                      key={n.id}
                      className={`flex items-start gap-3 px-2 py-3.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-50 ${!n.is_read ? "bg-blue-50/40" : ""}`}
                      onClick={() => !n.is_read && markOneMut.mutate(n.id)}
                    >
                      <span className="text-xl mt-0.5 shrink-0">{NOTIF_ICON[n.type] ?? "🔔"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${!n.is_read ? "text-slate-900" : "text-slate-600"}`}>
                            {n.title}
                          </span>
                          {!n.is_read && <Badge variant="blue">New</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* ── ACTIVITY LOG TAB ── */}
          {tab === "activity" && (
            <>
              {!isAdmin ? (
                <EmptyState
                  icon={<Activity className="h-12 w-12" />}
                  title="Access Restricted"
                  description="Activity logs are available to Admins and Auditors only."
                />
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <input
                      type="search"
                      placeholder="Filter by action..."
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {logData && (
                      <span className="text-xs text-slate-400">{logData.total} entries</span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          {["When", "Actor", "Action", "Entity", "Description"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {logLoading ? (
                          Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i} className="border-b border-slate-100">
                              {Array.from({ length: 5 }).map((_, j) => (
                                <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-200" /></td>
                              ))}
                            </tr>
                          ))
                        ) : !logData?.items.length ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                              No activity logs found.
                            </td>
                          </tr>
                        ) : (
                          logData.items.map((log) => (
                            <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  {fmtDateTime(log.created_at)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{log.actor_name ?? "System"}</div>
                                {log.actor_email && <div className="text-xs text-slate-400">{log.actor_email}</div>}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="blue">{log.action}</Badge>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {log.entity_type ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                                {log.description}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </AppShell>
  );
}
