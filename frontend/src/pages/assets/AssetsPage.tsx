import { useState } from "react";
import { Plus, Package, History, Pencil, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { AssetForm } from "./AssetForm";
import { AssetHistoryDrawer } from "./AssetHistoryDrawer";
import { useAssets, useCreateAsset, useUpdateAsset, useUpdateAssetStatus } from "@/hooks/useAssets";
import { useAssetCategories, useDepartments } from "@/hooks/useOrganization";
import { getApiErrorMessage } from "@/lib/axios";
import type { Asset, AssetFilters, AssetStatus } from "@/types/assets";

const STATUS_COLOR: Record<AssetStatus, "green" | "blue" | "purple" | "amber" | "red" | "slate"> = {
  AVAILABLE: "green", ALLOCATED: "blue", RESERVED: "purple",
  UNDER_MAINTENANCE: "amber", LOST: "red", RETIRED: "slate", DISPOSED: "slate",
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "ALLOCATED", label: "Allocated" },
  { value: "RESERVED", label: "Reserved" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "LOST", label: "Lost" },
  { value: "RETIRED", label: "Retired" },
  { value: "DISPOSED", label: "Disposed" },
];

const TRANSITION_OPTIONS: Record<AssetStatus, { value: string; label: string }[]> = {
  AVAILABLE:          [{ value: "ALLOCATED", label: "Allocate" }, { value: "RESERVED", label: "Reserve" }, { value: "UNDER_MAINTENANCE", label: "Send to Maintenance" }, { value: "LOST", label: "Mark Lost" }, { value: "RETIRED", label: "Retire" }],
  ALLOCATED:          [{ value: "AVAILABLE", label: "Return to Available" }, { value: "UNDER_MAINTENANCE", label: "Send to Maintenance" }, { value: "LOST", label: "Mark Lost" }],
  RESERVED:           [{ value: "AVAILABLE", label: "Cancel Reserve" }, { value: "ALLOCATED", label: "Allocate" }],
  UNDER_MAINTENANCE:  [{ value: "AVAILABLE", label: "Mark Repaired" }, { value: "RETIRED", label: "Retire" }],
  LOST:               [],
  RETIRED:            [{ value: "DISPOSED", label: "Dispose" }],
  DISPOSED:           [],
};

export default function AssetsPage() {
  const [filters, setFilters] = useState<AssetFilters>({ limit: 50 });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [statusModal, setStatusModal] = useState<Asset | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);

  const { data, isLoading } = useAssets(filters);
  const { data: categories } = useAssetCategories();
  const { data: departments } = useDepartments();
  const createMut = useCreateAsset();
  const updateMut = useUpdateAsset();
  const statusMut = useUpdateAssetStatus();

  const catOptions = [{ value: "", label: "All Categories" }, ...(categories?.items ?? []).map((c) => ({ value: c.id, label: c.name }))];
  const deptOptions = [{ value: "", label: "All Departments" }, ...(departments?.items ?? []).map((d) => ({ value: d.id, label: d.name }))];

  const openCreate = () => { setEditing(null); setFormError(null); setFormOpen(true); };
  const openEdit = (a: Asset) => { setEditing(a); setFormError(null); setFormOpen(true); };

  const onFormSubmit = async (fd: Record<string, unknown>) => {
    setFormError(null);
    const payload = {
      name: fd.name as string,
      description: (fd.description as string) || undefined,
      serial_number: (fd.serial_number as string) || undefined,
      location: (fd.location as string) || undefined,
      condition: (fd.condition as string) || undefined,
      category_id: (fd.category_id as string) || undefined,
      department_id: (fd.department_id as string) || undefined,
      purchase_date: (fd.purchase_date as string) || undefined,
      purchase_cost: fd.purchase_cost ? parseFloat(fd.purchase_cost as string) : undefined,
      current_value: fd.current_value ? parseFloat(fd.current_value as string) : undefined,
      warranty_expiry_date: (fd.warranty_expiry_date as string) || undefined,
      is_bookable: Boolean(fd.is_bookable),
    };
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, payload });
      else await createMut.mutateAsync(payload);
      setFormOpen(false);
    } catch (err) { setFormError(getApiErrorMessage(err)); }
  };

  const openStatusModal = (a: Asset) => {
    setStatusModal(a);
    setNewStatus("");
    setStatusReason("");
    setStatusError(null);
  };

  const onStatusSave = async () => {
    if (!statusModal || !newStatus) return;
    setStatusError(null);
    try {
      await statusMut.mutateAsync({ id: statusModal.id, status: newStatus as AssetStatus, reason: statusReason || undefined });
      setStatusModal(null);
    } catch (err) { setStatusError(getApiErrorMessage(err)); }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <AppShell title="Assets">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Asset Directory</h2>
          <p className="mt-1 text-sm text-slate-500">Register, search, and track all assets.</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />Register Asset</Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          type="search" placeholder="Search name, tag, serial, location…"
          value={filters.search ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={filters.status ?? ""} onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value as AssetStatus) || undefined }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.category_id ?? ""} onChange={(e) => setFilters((f) => ({ ...f, category_id: e.target.value || undefined }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.department_id ?? ""} onChange={(e) => setFilters((f) => ({ ...f, department_id: e.target.value || undefined }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {deptOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {Object.keys(filters).some((k) => k !== "limit" && filters[k as keyof AssetFilters]) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ limit: 50 })}>Clear filters</Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Tag", "Name", "Category", "Department", "Location", "Status", "Condition", "Bookable", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-200" /></td>)}
                  </tr>
                ))
              ) : !data?.items.length ? (
                <tr><td colSpan={9}>
                  <EmptyState icon={<Package className="h-12 w-12" />} title="No assets found"
                    description="Register your first asset or adjust the search filters."
                    action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Register Asset</Button>} />
                </td></tr>
              ) : (
                data.items.map((asset) => (
                  <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">{asset.asset_tag}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[160px] truncate">{asset.name}</td>
                    <td className="px-4 py-3 text-slate-500">{asset.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{asset.department?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{asset.location ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLOR[asset.status]}>{asset.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{asset.condition ?? "—"}</td>
                    <td className="px-4 py-3">
                      {asset.is_bookable ? <Badge variant="blue">Bookable</Badge> : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(asset)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openStatusModal(asset)} title="Change Status"><RefreshCw className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setHistoryAsset(asset)} title="View History"><History className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
            {data.total} asset{data.total !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Asset Form Modal */}
      <AssetForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={onFormSubmit}
        editing={editing} error={formError} isSaving={isSaving} />

      {/* Status Change Modal */}
      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title="Change Asset Status" size="sm">
        {statusModal && (
          <div className="flex flex-col gap-4">
            {statusError && <Alert variant="error" message={statusError} />}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Current:</span>
              <Badge variant={STATUS_COLOR[statusModal.status]}>{statusModal.status.replace("_", " ")}</Badge>
            </div>
            <Select
              id="new-status"
              label="New Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              options={TRANSITION_OPTIONS[statusModal.status]}
              placeholder="Select new status"
            />
            <Input id="status-reason" label="Reason (optional)" placeholder="Why is the status changing?" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setStatusModal(null)}>Cancel</Button>
              <Button onClick={onStatusSave} isLoading={statusMut.isPending} disabled={!newStatus}>Update Status</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* History Drawer + overlay */}
      {historyAsset && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setHistoryAsset(null)} />
      )}
      <AssetHistoryDrawer
        assetId={historyAsset?.id ?? null}
        assetTag={historyAsset?.asset_tag ?? ""}
        onClose={() => setHistoryAsset(null)}
      />
    </AppShell>
  );
}
