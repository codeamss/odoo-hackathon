import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, AlertTriangle, TrendingUp, Building2, Wrench, Calendar } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { useReportsSummary, exportCsv } from "@/hooks/useReports";

const TABS = [
  { key: "utilization", label: "Asset Utilization", icon: <TrendingUp className="h-4 w-4" /> },
  { key: "maintenance", label: "Maintenance", icon: <Wrench className="h-4 w-4" /> },
  { key: "departments", label: "Departments", icon: <Building2 className="h-4 w-4" /> },
  { key: "due", label: "Assets Due", icon: <AlertTriangle className="h-4 w-4" /> },
  { key: "heatmap", label: "Booking Heatmap", icon: <Calendar className="h-4 w-4" /> },
];

const COLORS = ["#2563eb","#16a34a","#d97706","#dc2626","#7c3aed","#0891b2","#be185d","#65a30d"];

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function SkeletonChart() {
  return <div className="h-56 animate-pulse rounded-lg bg-slate-100" />;
}

export default function ReportsPage() {
  const [tab, setTab] = useState("utilization");
  const { data, isLoading } = useReportsSummary();

  // ── Heatmap helpers ────────────────────────────────────────────────────────
  const heatmapGrid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  data?.booking_heatmap.forEach((s) => {
    if (s.day_of_week >= 0 && s.day_of_week < 7 && s.hour >= 0 && s.hour < 24) {
      heatmapGrid[s.day_of_week][s.hour] = s.booking_count;
    }
  });
  const maxHeat = Math.max(...(data?.booking_heatmap.map((s) => s.booking_count) ?? [1]), 1);

  return (
    <AppShell title="Reports">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Reports & Analytics</h2>
        <p className="mt-1 text-sm text-slate-500">Operational insights for asset management.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="p-5">

          {/* ── UTILIZATION ── */}
          {tab === "utilization" && (
            <div className="flex flex-col gap-6">
              <SectionCard title="Most Used Assets (by allocation count)"
                action={<Button size="sm" variant="outline" onClick={() => exportCsv("utilization")}><Download className="h-3.5 w-3.5 mr-1" />Export CSV</Button>}>
                {isLoading ? <SkeletonChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={(data?.utilization.most_used ?? []).slice(0, 8)} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="asset_tag" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number, _n: string, p: { payload: { asset_name: string } }) => [`${v} allocations`, p.payload.asset_name]} />
                      <Bar dataKey="allocation_count" fill="#2563eb" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>

              <SectionCard title="Days Allocated per Asset">
                {isLoading ? <SkeletonChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={(data?.utilization.most_used ?? []).slice(0, 8)} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="asset_tag" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${v} days`]} />
                      <Bar dataKey="total_days_allocated" fill="#16a34a" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>

              {(data?.utilization.idle.length ?? 0) > 0 && (
                <SectionCard title="Idle Assets (never allocated)">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 border-b">
                        {["Tag","Name","Category","Department","Status"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{(data?.utilization.idle ?? []).map((a) => (
                        <tr key={a.asset_id} className="border-b hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs">{a.asset_tag}</td>
                          <td className="px-3 py-2">{a.asset_name}</td>
                          <td className="px-3 py-2 text-slate-500">{a.category ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-500">{a.department ?? "—"}</td>
                          <td className="px-3 py-2"><Badge variant="slate">{a.status}</Badge></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {/* ── MAINTENANCE ── */}
          {tab === "maintenance" && (
            <div className="flex flex-col gap-6">
              <SectionCard title="Maintenance Requests by Category">
                {isLoading ? <SkeletonChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data?.maintenance_frequency.by_category ?? []}
                        dataKey="total_requests" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, total_requests }) => `${category}: ${total_requests}`}>
                        {(data?.maintenance_frequency.by_category ?? []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>

              <SectionCard title="Most Maintained Assets">
                {isLoading ? <SkeletonChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={(data?.maintenance_frequency.by_asset ?? []).slice(0, 8)} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="asset_tag" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="total_requests" name="Total" fill="#d97706" radius={[4,4,0,0]} />
                      <Bar dataKey="completed" name="Completed" fill="#16a34a" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>
            </div>
          )}

          {/* ── DEPARTMENTS ── */}
          {tab === "departments" && (
            <SectionCard title="Department-wise Allocation Summary"
              action={<Button size="sm" variant="outline" onClick={() => exportCsv("dept-allocation")}><Download className="h-3.5 w-3.5 mr-1" />Export CSV</Button>}>
              {isLoading ? <SkeletonChart /> : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data?.dept_allocation ?? []} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="department_name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="active_allocations" name="Active" fill="#2563eb" radius={[4,4,0,0]} />
                      <Bar dataKey="overdue_allocations" name="Overdue" fill="#dc2626" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 border-b">
                        {["Department","Total","Active","Overdue","Unique Assets"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{(data?.dept_allocation ?? []).map((d) => (
                        <tr key={d.department_id ?? "none"} className="border-b hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium">{d.department_name}</td>
                          <td className="px-3 py-2">{d.total_allocations}</td>
                          <td className="px-3 py-2"><Badge variant="blue">{d.active_allocations}</Badge></td>
                          <td className="px-3 py-2">{d.overdue_allocations > 0 ? <Badge variant="red">{d.overdue_allocations}</Badge> : "—"}</td>
                          <td className="px-3 py-2">{d.unique_assets}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>
              )}
            </SectionCard>
          )}

          {/* ── ASSETS DUE ── */}
          {tab === "due" && (
            <SectionCard title="Assets Due for Action (next 90 days)">
              {isLoading ? <SkeletonChart /> : !data?.assets_due.length ? (
                <p className="text-sm text-slate-400 text-center py-8">No assets due in the next 90 days.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 border-b">
                      {["Tag","Name","Category","Department","Due Type","Due Date","Days Left","Status"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{(data?.assets_due ?? []).map((a) => (
                      <tr key={`${a.asset_id}-${a.due_type}`} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-xs">{a.asset_tag}</td>
                        <td className="px-3 py-2 font-medium">{a.asset_name}</td>
                        <td className="px-3 py-2 text-slate-500">{a.category ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{a.department ?? "—"}</td>
                        <td className="px-3 py-2">
                          <Badge variant={a.due_type === "retirement" ? "red" : "amber"}>
                            {a.due_type.replace("_"," ")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{a.due_date ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`font-medium ${(a.days_until_due ?? 99) <= 30 ? "text-red-600" : "text-amber-600"}`}>
                            {a.days_until_due ?? "—"}d
                          </span>
                        </td>
                        <td className="px-3 py-2"><Badge variant="slate">{a.status}</Badge></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {/* ── HEATMAP ── */}
          {tab === "heatmap" && (
            <SectionCard title="Resource Booking Heatmap (peak usage windows)">
              {isLoading ? <SkeletonChart /> : (
                <div className="overflow-x-auto">
                  <div className="flex gap-1 min-w-max">
                    {/* Y-axis labels */}
                    <div className="flex flex-col gap-1 pt-6">
                      {DAYS.map((d) => (
                        <div key={d} className="h-8 flex items-center justify-end pr-2 text-xs text-slate-500 w-10">{d}</div>
                      ))}
                    </div>
                    {/* Grid */}
                    <div>
                      {/* Hour labels */}
                      <div className="flex gap-1 mb-1">
                        {Array.from({ length: 24 }, (_, h) => (
                          <div key={h} className="w-8 text-center text-xs text-slate-400">{h}</div>
                        ))}
                      </div>
                      {DAYS.map((_, d) => (
                        <div key={d} className="flex gap-1 mb-1">
                          {Array.from({ length: 24 }, (_, h) => {
                            const count = heatmapGrid[d][h];
                            const intensity = count / maxHeat;
                            return (
                              <div
                                key={h}
                                title={`${DAYS[d]} ${h}:00 — ${count} bookings`}
                                className="w-8 h-8 rounded"
                                style={{ backgroundColor: count === 0 ? "#f1f5f9" : `rgba(37, 99, 235, ${0.15 + intensity * 0.85})` }}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                    <div className="w-4 h-4 rounded bg-slate-100" /> Low
                    <div className="w-4 h-4 rounded bg-blue-300 ml-2" /> Medium
                    <div className="w-4 h-4 rounded bg-blue-700 ml-2" /> High
                  </div>
                </div>
              )}
            </SectionCard>
          )}

        </div>
      </div>
    </AppShell>
  );
}
