import { useState } from "react";
import { Plus, ClipboardList, Play, Lock, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuditCycles, useCreateCycle, useStartCycle, useCloseCycle, useRecordFinding, useDiscrepancyReport } from "@/hooks/useAudit";
import { useAssets } from "@/hooks/useAssets";
import { useEmployees, useDepartments } from "@/hooks/useOrganization";
import { getApiErrorMessage } from "@/lib/axios";
import type { AuditCycle } from "@/types/audit";

const STATUS_COLOR: Record<string, "blue"|"green"|"amber"|"slate"> = {
  PLANNED:"blue", IN_PROGRESS:"amber", COMPLETED:"green", CANCELLED:"slate",
};

const OBSERVED_OPTIONS = [
  { value:"VERIFIED", label:"Verified — Asset found, matches records" },
  { value:"MISSING", label:"Missing — Asset not found" },
  { value:"DAMAGED", label:"Damaged — Asset found but damaged" },
];

function fmt(iso: string) { return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }

export default function AuditPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [findingModal, setFindingModal] = useState<AuditCycle | null>(null);
  const [reportModal, setReportModal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  // Create form
  const [cycleName, setCycleName] = useState("");
  const [cycleDesc, setCycleDesc] = useState("");
  const [scopeDept, setScopeDept] = useState("");
  const [scopeLocation, setScopeLocation] = useState("");
  const [schedStart, setSchedStart] = useState("");
  const [schedEnd, setSchedEnd] = useState("");
  const [auditorIds, setAuditorIds] = useState<string[]>([]);

  // Finding form
  const [findAsset, setFindAsset] = useState("");
  const [findStatus, setFindStatus] = useState("VERIFIED");
  const [findNotes, setFindNotes] = useState("");

  const { data, isLoading } = useAuditCycles({ status: statusFilter || undefined });
  const { data: assets } = useAssets({ limit: 500 });
  const { data: employees } = useEmployees();
  const { data: depts } = useDepartments();
  const { data: report } = useDiscrepancyReport(reportModal);

  const createMut = useCreateCycle();
  const startMut = useStartCycle();
  const closeMut = useCloseCycle();
  const findingMut = useRecordFinding();

  const assetOptions = (assets?.items ?? []).map((a) => ({ value: a.id, label: `${a.asset_tag} — ${a.name}` }));
  const empOptions = (employees?.items ?? []).map((e) => ({ value: e.id, label: e.full_name }));
  const deptOptions = [{ value: "", label: "All Departments" }, ...(depts?.items ?? []).map((d) => ({ value: d.id, label: d.name }))];

  const STATUS_OPTIONS = [
    { value:"", label:"All Statuses" },
    { value:"PLANNED", label:"Planned" },
    { value:"IN_PROGRESS", label:"In Progress" },
    { value:"COMPLETED", label:"Completed" },
  ];

  const onCreate = async () => {
    setError(null);
    if (!cycleName || !schedStart || !schedEnd) { setError("Name and dates are required."); return; }
    try {
      await createMut.mutateAsync({
        name: cycleName, description: cycleDesc || undefined,
        scope_department_id: scopeDept || undefined,
        scope_location: scopeLocation || undefined,
        scheduled_start: new Date(schedStart).toISOString(),
        scheduled_end: new Date(schedEnd).toISOString(),
        auditor_ids: auditorIds,
      });
      setCreateOpen(false); setCycleName(""); setCycleDesc(""); setScopeDept(""); setScopeLocation(""); setSchedStart(""); setSchedEnd(""); setAuditorIds([]);
    } catch (err) { setError(getApiErrorMessage(err)); }
  };

  const onFinding = async () => {
    if (!findingModal || !findAsset) { setError("Select an asset."); return; }
    setError(null);
    try {
      await findingMut.mutateAsync({ cycleId: findingModal.id, asset_id: findAsset, observed_status: findStatus, notes: findNotes || undefined });
      setFindAsset(""); setFindNotes(""); setFindStatus("VERIFIED");
    } catch (err) { setError(getApiErrorMessage(err)); }
  };

  const toggleAuditor = (id: string) =>
    setAuditorIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <AppShell title="Audit">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Asset Audit</h2>
          <p className="mt-1 text-sm text-slate-500">Create cycles, assign auditors, record findings, generate discrepancy reports.</p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setError(null); }} size="sm">
          <Plus className="h-4 w-4 mr-1" />New Audit Cycle
        </Button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Cycle cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200" />)}
        </div>
      ) : !data?.items.length ? (
        <EmptyState icon={<ClipboardList className="h-12 w-12" />} title="No audit cycles"
          description="Create your first audit cycle to start verifying assets."
          action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />New Cycle</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((cycle) => (
            <div key={cycle.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{cycle.name}</h3>
                  {cycle.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{cycle.description}</p>}
                </div>
                <Badge variant={STATUS_COLOR[cycle.status]}>{cycle.status.replace("_"," ")}</Badge>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <div>{fmt(cycle.scheduled_start)} → {fmt(cycle.scheduled_end)}</div>
                <div>{cycle.auditor_ids.length} auditor{cycle.auditor_ids.length !== 1 ? "s" : ""} · {cycle.total_findings} finding{cycle.total_findings !== 1 ? "s" : ""}</div>
                {cycle.discrepancy_count > 0 && (
                  <div className="flex items-center gap-1 text-red-600 font-medium">
                    <AlertTriangle className="h-3 w-3" />{cycle.discrepancy_count} discrepanc{cycle.discrepancy_count !== 1 ? "ies" : "y"}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {cycle.status === "PLANNED" && (
                  <Button size="sm" variant="outline" onClick={() => startMut.mutate(cycle.id)} isLoading={startMut.isPending}>
                    <Play className="h-3 w-3 mr-1" />Start
                  </Button>
                )}
                {cycle.status === "IN_PROGRESS" && (
                  <>
                    <Button size="sm" onClick={() => { setFindingModal(cycle); setError(null); setFindAsset(""); setFindStatus("VERIFIED"); setFindNotes(""); }}>
                      <CheckCircle className="h-3 w-3 mr-1" />Record Finding
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => { if (window.confirm("Close and lock this cycle?")) closeMut.mutate(cycle.id); }} isLoading={closeMut.isPending}>
                      <Lock className="h-3 w-3 mr-1" />Close Cycle
                    </Button>
                  </>
                )}
                {cycle.total_findings > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setReportModal(cycle.id)}>
                    <FileText className="h-3 w-3 mr-1" />Report
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Audit Cycle" size="lg">
        <div className="flex flex-col gap-4">
          {error && <Alert variant="error" message={error} />}
          <Input id="cy-name" label="Cycle Name *" placeholder="e.g. Q3 2026 Physical Audit" value={cycleName} onChange={(e) => setCycleName(e.target.value)} />
          <Input id="cy-desc" label="Description (optional)" value={cycleDesc} onChange={(e) => setCycleDesc(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Select id="cy-dept" label="Scope: Department (optional)" value={scopeDept} onChange={(e) => setScopeDept(e.target.value)} options={deptOptions} placeholder="All departments" />
            <Input id="cy-loc" label="Scope: Location (optional)" placeholder="e.g. HQ Floor 2" value={scopeLocation} onChange={(e) => setScopeLocation(e.target.value)} />
            <Input id="cy-start" label="Scheduled Start *" type="date" value={schedStart} onChange={(e) => setSchedStart(e.target.value)} />
            <Input id="cy-end" label="Scheduled End *" type="date" value={schedEnd} onChange={(e) => setSchedEnd(e.target.value)} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Assign Auditors</p>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y">
              {empOptions.map((e) => (
                <label key={e.value} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                  <input type="checkbox" checked={auditorIds.includes(e.value)} onChange={() => toggleAuditor(e.value)} className="rounded" />
                  {e.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={onCreate} isLoading={createMut.isPending}>Create Cycle</Button>
          </div>
        </div>
      </Modal>

      {/* Record Finding Modal */}
      <Modal open={!!findingModal} onClose={() => setFindingModal(null)} title="Record Audit Finding" size="sm">
        {findingModal && (
          <div className="flex flex-col gap-4">
            {error && <Alert variant="error" message={error} />}
            <p className="text-sm text-slate-600">Cycle: <strong>{findingModal.name}</strong></p>
            <Select id="f-asset" label="Asset" value={findAsset} onChange={(e) => setFindAsset(e.target.value)} options={assetOptions} placeholder="Select asset" />
            <Select id="f-status" label="Observed Status" value={findStatus} onChange={(e) => setFindStatus(e.target.value)} options={OBSERVED_OPTIONS} />
            <Input id="f-notes" label="Notes (optional)" placeholder="Any observations" value={findNotes} onChange={(e) => setFindNotes(e.target.value)} />
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setFindingModal(null)}>Done</Button>
              <Button onClick={onFinding} isLoading={findingMut.isPending}>Record</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Discrepancy Report Modal */}
      <Modal open={!!reportModal} onClose={() => setReportModal(null)} title="Discrepancy Report" size="lg">
        {report && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label:"Total Audited", value:report.total_assets_audited, color:"slate" },
                { label:"Verified", value:report.verified, color:"green" },
                { label:"Missing", value:report.missing, color:"red" },
                { label:"Damaged", value:report.damaged, color:"amber" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-slate-200 p-3 text-center">
                  <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            {report.findings.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-4">No discrepancies found.</p>
            ) : (
              <div className="overflow-y-auto max-h-64 space-y-2">
                {report.findings.map((f) => (
                  <div key={f.id} className="rounded-lg border border-slate-100 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{f.asset.asset_tag} — {f.asset.name}</span>
                      <Badge variant={f.observed_status === "MISSING" ? "red" : f.observed_status === "DAMAGED" ? "amber" : "slate"}>
                        {f.observed_status}
                      </Badge>
                    </div>
                    {f.notes && <p className="text-xs text-slate-500 mt-1">{f.notes}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">Expected: {f.expected_status} · Auditor: {f.auditor?.full_name ?? "—"}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setReportModal(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
