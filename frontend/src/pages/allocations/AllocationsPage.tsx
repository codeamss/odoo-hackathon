import { useState } from "react";
import { Plus, RotateCcw, ArrowRightLeft, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAllocations, useAllocate, useReturnAsset, useTransfers, useCreateTransfer, useReviewTransfer, useConflictCheck } from "@/hooks/useAllocations";
import { useAssets } from "@/hooks/useAssets";
import { useEmployees } from "@/hooks/useOrganization";
import { getApiErrorMessage } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import type { Allocation, TransferRequest } from "@/types/allocations";

const TABS = [
  { key: "active", label: "Active Allocations", icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: "overdue", label: "Overdue", icon: <AlertTriangle className="h-4 w-4" /> },
  { key: "transfers", label: "Transfer Requests", icon: <ArrowRightLeft className="h-4 w-4" /> },
];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AllocationsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("active");
  const [allocOpen, setAllocOpen] = useState(false);
  const [returnModal, setReturnModal] = useState<Allocation | null>(null);
  const [transferModal, setTransferModal] = useState<Allocation | null>(null);
  const [reviewModal, setReviewModal] = useState<TransferRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Allocate form state
  const [selAssetId, setSelAssetId] = useState("");
  const [selUserId, setSelUserId] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [allocNotes, setAllocNotes] = useState("");

  // Return form state
  const [conditionNotes, setConditionNotes] = useState("");

  // Transfer form state
  const [transferUserId, setTransferUserId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  // Review state
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: allocations, isLoading: allocLoading } = useAllocations(tab === "overdue" ? { overdue_only: true } : { status: tab === "active" ? "ACTIVE" : undefined });
  const { data: transfers, isLoading: transferLoading } = useTransfers(tab === "transfers" ? {} : undefined);
  const { data: assets } = useAssets({ status: "AVAILABLE", limit: 200 });
  const { data: employees } = useEmployees();
  const { data: conflict } = useConflictCheck(selAssetId || null);

  const allocateMut = useAllocate();
  const returnMut = useReturnAsset();
  const transferMut = useCreateTransfer();
  const reviewMut = useReviewTransfer();

  const assetOptions = (assets?.items ?? []).map((a) => ({ value: a.id, label: `${a.asset_tag} — ${a.name}` }));
  const empOptions = (employees?.items ?? []).map((e) => ({ value: e.id, label: `${e.full_name} (${e.role})` }));

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "MANAGER";

  const onAllocate = async () => {
    setError(null);
    if (!selAssetId || !selUserId) { setError("Select asset and employee."); return; }
    try {
      await allocateMut.mutateAsync({ asset_id: selAssetId, allocated_to_user_id: selUserId, expected_return_date: returnDate || undefined, notes: allocNotes || undefined });
      setAllocOpen(false); setSelAssetId(""); setSelUserId(""); setReturnDate(""); setAllocNotes("");
    } catch (err) { setError(getApiErrorMessage(err)); }
  };

  const onReturn = async () => {
    if (!returnModal) return;
    setError(null);
    try {
      await returnMut.mutateAsync({ alloc_id: returnModal.id, condition_notes: conditionNotes || undefined });
      setReturnModal(null); setConditionNotes("");
    } catch (err) { setError(getApiErrorMessage(err)); }
  };

  const onTransferRequest = async () => {
    if (!transferModal || !transferUserId) { setError("Select a target employee."); return; }
    setError(null);
    try {
      await transferMut.mutateAsync({ asset_id: transferModal.asset_id, requested_for_user_id: transferUserId, reason: transferReason || undefined });
      setTransferModal(null); setTransferUserId(""); setTransferReason("");
    } catch (err) { setError(getApiErrorMessage(err)); }
  };

  const onReview = async (approved: boolean) => {
    if (!reviewModal) return;
    try {
      await reviewMut.mutateAsync({ id: reviewModal.id, approved, review_notes: reviewNotes || undefined });
      setReviewModal(null); setReviewNotes("");
    } catch (err) { alert(getApiErrorMessage(err)); }
  };

  return (
    <AppShell title="Allocations">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Asset Allocations</h2>
          <p className="mt-1 text-sm text-slate-500">Allocate assets, manage returns, and approve transfers.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setAllocOpen(true); setError(null); setSelAssetId(""); setSelUserId(""); }} size="sm">
            <Plus className="h-4 w-4 mr-1" />Allocate Asset
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Tabs
          tabs={TABS.map((t) => ({
            ...t,
            count: t.key === "transfers" ? (transfers?.total) : (allocations?.total),
          }))}
          active={tab}
          onChange={setTab}
        />
        <div className="p-5">
          {/* ── Active / Overdue allocations ── */}
          {(tab === "active" || tab === "overdue") && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Asset", "Assigned To", "By", "Allocated", "Due", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allocLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-200" /></td>)}
                      </tr>
                    ))
                  ) : !allocations?.items.length ? (
                    <tr><td colSpan={7}>
                      <EmptyState icon={<CheckCircle2 className="h-12 w-12" />} title={tab === "overdue" ? "No overdue allocations" : "No active allocations"} description="All assets are accounted for." />
                    </td></tr>
                  ) : (
                    allocations.items.map((a) => (
                      <tr key={a.id} className={`border-b border-slate-100 hover:bg-slate-50 ${a.is_overdue ? "bg-red-50" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{a.asset.name}</div>
                          <span className="text-xs text-slate-400 font-mono">{a.asset.asset_tag}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{a.allocated_to_user?.full_name ?? a.allocated_to_dept?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500">{a.allocated_by.full_name}</td>
                        <td className="px-4 py-3 text-slate-500">{fmtDate(a.allocated_at)}</td>
                        <td className="px-4 py-3">
                          {a.expected_return_date ? (
                            <span className={a.is_overdue ? "text-red-600 font-medium" : "text-slate-500"}>
                              {a.is_overdue && <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />}
                              {fmtDate(a.expected_return_date)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={a.is_overdue ? "red" : "blue"}>{a.is_overdue ? "OVERDUE" : a.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => { setReturnModal(a); setConditionNotes(""); setError(null); }}>
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />Return
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setTransferModal(a); setTransferUserId(""); setTransferReason(""); setError(null); }} title="Request Transfer">
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Transfer Requests ── */}
          {tab === "transfers" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Asset", "Requested By", "Transfer To", "Reason", "Status", "Date", isAdmin ? "Actions" : ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transferLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-200" /></td>)}
                      </tr>
                    ))
                  ) : !transfers?.items.length ? (
                    <tr><td colSpan={7}>
                      <EmptyState icon={<ArrowRightLeft className="h-12 w-12" />} title="No transfer requests" description="Transfer requests appear here when employees request asset transfers." />
                    </td></tr>
                  ) : (
                    transfers.items.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{t.asset.name}</div>
                          <span className="text-xs text-slate-400 font-mono">{t.asset.asset_tag}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{t.requested_by.full_name}</td>
                        <td className="px-4 py-3 text-slate-700">{t.requested_for_user?.full_name ?? t.requested_for_dept?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{t.reason ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={t.status === "PENDING" ? "amber" : t.status === "COMPLETED" ? "green" : t.status === "REJECTED" ? "red" : "slate"}>
                            {t.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{fmtDate(t.created_at)}</td>
                        <td className="px-4 py-3">
                          {isAdmin && t.status === "PENDING" && (
                            <Button variant="outline" size="sm" onClick={() => { setReviewModal(t); setReviewNotes(""); }}>
                              Review
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Allocate Modal ── */}
      <Modal open={allocOpen} onClose={() => setAllocOpen(false)} title="Allocate Asset" size="md">
        <div className="flex flex-col gap-4">
          {error && <Alert variant="error" message={error} />}
          {conflict?.is_conflict && (
            <Alert variant="error" message={`This asset is currently held by ${conflict.current_holder}. Use Transfer Request instead.`} />
          )}
          <Select id="alloc-asset" label="Asset (Available only)" value={selAssetId}
            onChange={(e) => setSelAssetId(e.target.value)}
            options={assetOptions} placeholder="Select asset" />
          <Select id="alloc-user" label="Assign To (Employee)" value={selUserId}
            onChange={(e) => setSelUserId(e.target.value)}
            options={empOptions} placeholder="Select employee" />
          <Input id="alloc-return" label="Expected Return Date (optional)" type="date"
            value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
          <Input id="alloc-notes" label="Notes (optional)" placeholder="Any notes"
            value={allocNotes} onChange={(e) => setAllocNotes(e.target.value)} />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setAllocOpen(false)}>Cancel</Button>
            <Button onClick={onAllocate} isLoading={allocateMut.isPending} disabled={conflict?.is_conflict}>
              Allocate
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Return Modal ── */}
      <Modal open={!!returnModal} onClose={() => setReturnModal(null)} title="Return Asset" size="sm">
        {returnModal && (
          <div className="flex flex-col gap-4">
            {error && <Alert variant="error" message={error} />}
            <p className="text-sm text-slate-600">
              Returning <strong>{returnModal.asset.asset_tag} — {returnModal.asset.name}</strong>.<br />
              The asset status will revert to <Badge variant="green">AVAILABLE</Badge>.
            </p>
            <Input id="ret-cond" label="Condition Notes (optional)" placeholder="e.g. Minor scratch on lid"
              value={conditionNotes} onChange={(e) => setConditionNotes(e.target.value)} />
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setReturnModal(null)}>Cancel</Button>
              <Button onClick={onReturn} isLoading={returnMut.isPending}>Confirm Return</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Transfer Request Modal ── */}
      <Modal open={!!transferModal} onClose={() => setTransferModal(null)} title="Request Transfer" size="sm">
        {transferModal && (
          <div className="flex flex-col gap-4">
            {error && <Alert variant="error" message={error} />}
            <Alert variant="info" message={`${transferModal.asset.asset_tag} is currently held by ${transferModal.allocated_to_user?.full_name ?? transferModal.allocated_to_dept?.name ?? "unknown"}. A manager must approve this transfer.`} />
            <Select id="tr-user" label="Transfer To (Employee)" value={transferUserId}
              onChange={(e) => setTransferUserId(e.target.value)}
              options={empOptions} placeholder="Select employee" />
            <Input id="tr-reason" label="Reason" placeholder="Why is the transfer needed?"
              value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setTransferModal(null)}>Cancel</Button>
              <Button onClick={onTransferRequest} isLoading={transferMut.isPending}>Submit Request</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Review Transfer Modal ── */}
      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title="Review Transfer Request" size="sm">
        {reviewModal && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              <strong>{reviewModal.requested_by.full_name}</strong> wants to transfer <strong>{reviewModal.asset.asset_tag}</strong> to <strong>{reviewModal.requested_for_user?.full_name ?? reviewModal.requested_for_dept?.name}</strong>.
            </p>
            {reviewModal.reason && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Reason: {reviewModal.reason}</p>}
            <Input id="rev-notes" label="Review Notes (optional)" placeholder="Add notes"
              value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="danger" onClick={() => onReview(false)} isLoading={reviewMut.isPending}>Reject</Button>
              <Button onClick={() => onReview(true)} isLoading={reviewMut.isPending}>Approve & Transfer</Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
