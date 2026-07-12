import { useState } from "react";
import { Plus, Wrench, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMaintenance, useCreateMaintenance, useMaintenanceAction } from "@/hooks/useMaintenance";
import { useAssets } from "@/hooks/useAssets";
import { useEmployees } from "@/hooks/useOrganization";
import { getApiErrorMessage } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import type { MaintenanceRequest } from "@/types/maintenance";

const STATUS_COLOR: Record<string, "blue"|"green"|"amber"|"red"|"purple"|"slate"> = {
  DRAFT:"slate", SUBMITTED:"blue", UNDER_REVIEW:"purple", APPROVED:"green",
  IN_PROGRESS:"amber", COMPLETED:"green", REJECTED:"red", CANCELLED:"slate",
};

const PRIORITY_COLOR: Record<string, "red"|"amber"|"blue"|"slate"> = {
  CRITICAL:"red", HIGH:"amber", MEDIUM:"blue", LOW:"slate",
};

const ACTION_LABELS: Record<string, string> = {
  submit:"Submit", approve:"Approve", reject:"Reject", assign:"Assign Technician",
  start:"Start Work", complete:"Mark Complete", cancel:"Cancel",
};

const PRIORITY_OPTIONS = [
  { value:"LOW", label:"Low" }, { value:"MEDIUM", label:"Medium" },
  { value:"HIGH", label:"High" }, { value:"CRITICAL", label:"Critical" },
];

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}

export default function MaintenancePage() {
  const { user } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{ req: MaintenanceRequest; action: string } | null>(null);
  const [myOnly, setMyOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [selAsset, setSelAsset] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  // Action form
  const [assignTo, setAssignTo] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [actionNotes, setActionNotes] = useState("");

  const { data, isLoading } = useMaintenance({ status: statusFilter || undefined, my_only: myOnly });
  const { data: assets } = useAssets({ limit: 200 });
  const { data: employees } = useEmployees();
  const createMut = useCreateMaintenance();
  const actionMut = useMaintenanceAction();

  const assetOptions = (assets?.items ?? []).map((a) => ({ value: a.id, label: `${a.asset_tag} — ${a.name}` }));
  const empOptions = (employees?.items ?? []).map((e) => ({ value: e.id, label: `${e.full_name} (${e.role})` }));

  const STATUS_OPTIONS = [
    { value:"", label:"All Statuses" },
    ...["DRAFT","SUBMITTED","APPROVED","IN_PROGRESS","COMPLETED","REJECTED","CANCELLED"].map((s) => ({ value:s, label:s.replace("_"," ") })),
  ];

  const onCreate = async () => {
    setError(null);
    if (!selAsset || !description) { setError("Asset and description are required."); return; }
    try {
      await createMut.mutateAsync({ asset_id: selAsset, description, priority });
      setCreateOpen(false); setSelAsset(""); setDescription(""); setPriority("MEDIUM");
    } catch (err) { setError(getApiErrorMessage(err)); }
  };

  const onAction = async () => {
    if (!actionModal) return;
    setError(null);
    try {
      await actionMut.mutateAsync({
        id: actionModal.req.id,
        action: actionModal.action,
        assigned_to_id: assignTo || undefined,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        actual_cost: actualCost ? parseFloat(actualCost) : undefined,
        notes: actionNotes || undefined,
      });
      setActionModal(null);
    } catch (err) { setError(getApiErrorMessage(err)); }
  };

  return (
    <AppShell title="Maintenance">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Maintenance Management</h2>
          <p className="mt-1 text-sm text-slate-500">Raise requests, approve repairs, track resolution.</p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setError(null); }} size="sm">
          <Plus className="h-4 w-4 mr-1" />Raise Request
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={myOnly} onChange={(e) => setMyOnly(e.target.checked)} className="rounded" />
          My requests only
        </label>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Asset","Description","Priority","Requested By","Assigned To","Status","Submitted","Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-200" /></td>)}
                  </tr>
                ))
              ) : !data?.items.length ? (
                <tr><td colSpan={8}>
                  <EmptyState icon={<Wrench className="h-12 w-12" />} title="No maintenance requests"
                    description="Raise a request when an asset needs repair."
                    action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />Raise Request</Button>} />
                </td></tr>
              ) : (
                data.items.map((req) => (
                  <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{req.asset.name}</div>
                      <span className="text-xs text-slate-400 font-mono">{req.asset.asset_tag}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{req.description}</td>
                    <td className="px-4 py-3"><Badge variant={PRIORITY_COLOR[req.priority]}>{req.priority}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{req.requested_by.full_name}</td>
                    <td className="px-4 py-3 text-slate-500">{req.assigned_to?.full_name ?? "—"}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_COLOR[req.status]}>{req.status.replace("_"," ")}</Badge></td>
                    <td className="px-4 py-3 text-slate-500">{fmt(req.submitted_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {req.allowed_actions.map((action) => (
                          <Button key={action} size="sm" variant={action === "reject" || action === "cancel" ? "danger" : "outline"}
                            onClick={() => { setActionModal({ req, action }); setAssignTo(""); setEstimatedCost(""); setActualCost(""); setActionNotes(""); setError(null); }}>
                            <ChevronRight className="h-3 w-3 mr-1" />{ACTION_LABELS[action] ?? action}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">{data.total} request{data.total !== 1 ? "s" : ""}</div>}
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Raise Maintenance Request" size="md">
        <div className="flex flex-col gap-4">
          {error && <Alert variant="error" message={error} />}
          <Select id="m-asset" label="Asset" value={selAsset} onChange={(e) => setSelAsset(e.target.value)}
            options={assetOptions} placeholder="Select asset" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} />
          </div>
          <Select id="m-priority" label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}
            options={PRIORITY_OPTIONS} />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={onCreate} isLoading={createMut.isPending}>Submit Request</Button>
          </div>
        </div>
      </Modal>

      {/* Action Modal */}
      <Modal open={!!actionModal} onClose={() => setActionModal(null)}
        title={ACTION_LABELS[actionModal?.action ?? ""] ?? "Action"} size="sm">
        {actionModal && (
          <div className="flex flex-col gap-4">
            {error && <Alert variant="error" message={error} />}
            <p className="text-sm text-slate-600">
              Asset: <strong>{actionModal.req.asset.asset_tag} — {actionModal.req.asset.name}</strong>
            </p>
            {actionModal.action === "assign" && (
              <Select id="act-assign" label="Assign Technician" value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                options={empOptions} placeholder="Select technician" />
            )}
            {actionModal.action === "approve" && (
              <Input id="act-est" label="Estimated Cost (optional)" type="number" placeholder="0.00"
                value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
            )}
            {actionModal.action === "complete" && (
              <Input id="act-actual" label="Actual Cost (optional)" type="number" placeholder="0.00"
                value={actualCost} onChange={(e) => setActualCost(e.target.value)} />
            )}
            <Input id="act-notes" label="Notes (optional)" placeholder="Add any notes"
              value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} />
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
              <Button onClick={onAction} isLoading={actionMut.isPending}
                variant={actionModal.action === "reject" || actionModal.action === "cancel" ? "danger" : "primary"}>
                {ACTION_LABELS[actionModal.action] ?? "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
