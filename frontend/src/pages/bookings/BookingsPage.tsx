import { useState } from "react";
import { Plus, Calendar, XCircle, Pencil, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { useBookings, useCreateBooking, useUpdateBooking, useCancelBooking, useCalendar } from "@/hooks/useBookings";
import { useAssets } from "@/hooks/useAssets";
import { getApiErrorMessage } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import type { Booking } from "@/types/bookings";

const STATUS_COLOR: Record<string, "blue" | "green" | "amber" | "red" | "slate"> = {
  UPCOMING: "blue", ONGOING: "green", COMPLETED: "slate", CANCELLED: "red",
};

const TABS = [
  { key: "my", label: "My Bookings", icon: <Calendar className="h-4 w-4" /> },
  { key: "all", label: "All Bookings", icon: <Clock className="h-4 w-4" /> },
  { key: "calendar", label: "Resource Calendar", icon: <Calendar className="h-4 w-4" /> },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

export default function BookingsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("my");
  const [bookOpen, setBookOpen] = useState(false);
  const [editModal, setEditModal] = useState<Booking | null>(null);
  const [calAssetId, setCalAssetId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selAsset, setSelAsset] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editPurpose, setEditPurpose] = useState("");

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "MANAGER";

  const myParams = tab === "my" ? { my_only: true } : {};
  const { data, isLoading } = useBookings(tab !== "calendar" ? myParams : undefined);
  const { data: calendar } = useCalendar(tab === "calendar" && calAssetId ? calAssetId : null);
  const { data: assets } = useAssets({ is_bookable: true, limit: 200 });

  const createMut = useCreateBooking();
  const updateMut = useUpdateBooking();
  const cancelMut = useCancelBooking();

  const bookableOptions = (assets?.items ?? []).map((a) => ({ value: a.id, label: `${a.asset_tag} — ${a.name}${a.location ? ` (${a.location})` : ""}` }));

  const onBook = async () => {
    setError(null);
    if (!selAsset || !startTime || !endTime) { setError("All fields required."); return; }
    try {
      await createMut.mutateAsync({
        asset_id: selAsset,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        purpose: purpose || undefined,
      });
      setBookOpen(false); setSelAsset(""); setStartTime(""); setEndTime(""); setPurpose("");
    } catch (err) { setError(getApiErrorMessage(err)); }
  };

  const openEdit = (b: Booking) => {
    setEditModal(b);
    setEditStart(b.start_time.slice(0, 16));
    setEditEnd(b.end_time.slice(0, 16));
    setEditPurpose(b.purpose ?? "");
    setError(null);
  };

  const onEdit = async () => {
    if (!editModal) return;
    setError(null);
    try {
      await updateMut.mutateAsync({
        id: editModal.id,
        start_time: new Date(editStart).toISOString(),
        end_time: new Date(editEnd).toISOString(),
        purpose: editPurpose || undefined,
      });
      setEditModal(null);
    } catch (err) { setError(getApiErrorMessage(err)); }
  };

  const onCancel = async (id: string) => {
    if (!window.confirm("Cancel this booking?")) return;
    try { await cancelMut.mutateAsync(id); }
    catch (err) { alert(getApiErrorMessage(err)); }
  };

  return (
    <AppShell title="Bookings">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Resource Bookings</h2>
          <p className="mt-1 text-sm text-slate-500">Book shared resources by time slot. Overlapping bookings are blocked.</p>
        </div>
        <Button onClick={() => { setBookOpen(true); setError(null); }} size="sm">
          <Plus className="h-4 w-4 mr-1" />Book Resource
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Tabs tabs={TABS.map((t) => ({ ...t, count: tab !== "calendar" ? data?.total : undefined }))} active={tab} onChange={setTab} />
        <div className="p-5">

          {/* Calendar tab — resource picker + slot list */}
          {tab === "calendar" && (
            <div className="flex flex-col gap-4">
              <Select id="cal-asset" label="Select Resource" value={calAssetId}
                onChange={(e) => setCalAssetId(e.target.value)}
                options={bookableOptions} placeholder="Choose a bookable resource" />
              {calAssetId && (
                <div>
                  {!calendar?.length ? (
                    <p className="text-sm text-slate-400 py-8 text-center">No upcoming bookings for this resource.</p>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2">
                      {calendar.map((slot) => (
                        <div key={slot.booking_id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                          <div>
                            <span className="text-sm font-medium text-slate-900">{fmt(slot.start_time)} → {fmt(slot.end_time)}</span>
                            <div className="text-xs text-slate-500 mt-0.5">{slot.booked_by_name}{slot.purpose ? ` · ${slot.purpose}` : ""}</div>
                          </div>
                          <Badge variant={slot.status === "CONFIRMED" ? "blue" : "amber"}>{slot.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Booking list tabs */}
          {tab !== "calendar" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Resource", "Booked By", "Start", "End", "Purpose", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-200" /></td>)}
                      </tr>
                    ))
                  ) : !data?.items.length ? (
                    <tr><td colSpan={7}>
                      <EmptyState icon={<Calendar className="h-12 w-12" />} title="No bookings" description="Book a shared resource to get started."
                        action={<Button size="sm" onClick={() => setBookOpen(true)}><Plus className="h-4 w-4 mr-1" />Book Resource</Button>} />
                    </td></tr>
                  ) : (
                    data.items.map((b) => (
                      <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{b.asset.name}</div>
                          <span className="text-xs text-slate-400 font-mono">{b.asset.asset_tag}</span>
                          {b.asset.location && <div className="text-xs text-slate-400">{b.asset.location}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{b.booked_by.full_name}</td>
                        <td className="px-4 py-3 text-slate-600">{fmt(b.start_time)}</td>
                        <td className="px-4 py-3 text-slate-600">{fmt(b.end_time)}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">{b.purpose ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_COLOR[b.computed_status] ?? "slate"}>{b.computed_status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {b.computed_status !== "CANCELLED" && b.computed_status !== "COMPLETED" && (
                            <div className="flex items-center gap-1.5">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(b)} title="Reschedule">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => onCancel(b.id)} title="Cancel">
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
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

      {/* Book Modal */}
      <Modal open={bookOpen} onClose={() => setBookOpen(false)} title="Book a Resource" size="md">
        <div className="flex flex-col gap-4">
          {error && <Alert variant="error" message={error} />}
          <Select id="bk-asset" label="Resource" value={selAsset} onChange={(e) => setSelAsset(e.target.value)}
            options={bookableOptions} placeholder="Select bookable resource" />
          <div className="grid grid-cols-2 gap-4">
            <Input id="bk-start" label="Start Time" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <Input id="bk-end" label="End Time" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <Input id="bk-purpose" label="Purpose (optional)" placeholder="e.g. Team standup" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setBookOpen(false)}>Cancel</Button>
            <Button onClick={onBook} isLoading={createMut.isPending}>Confirm Booking</Button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Reschedule Booking" size="md">
        {editModal && (
          <div className="flex flex-col gap-4">
            {error && <Alert variant="error" message={error} />}
            <p className="text-sm text-slate-600 font-medium">{editModal.asset.asset_tag} — {editModal.asset.name}</p>
            <div className="grid grid-cols-2 gap-4">
              <Input id="ed-start" label="New Start Time" type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
              <Input id="ed-end" label="New End Time" type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
            </div>
            <Input id="ed-purpose" label="Purpose (optional)" value={editPurpose} onChange={(e) => setEditPurpose(e.target.value)} />
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button onClick={onEdit} isLoading={updateMut.isPending}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
