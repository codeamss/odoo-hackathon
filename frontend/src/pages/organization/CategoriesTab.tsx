import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { getApiErrorMessage } from "@/lib/axios";
import { useAssetCategories, useCreateCategory, useUpdateCategory } from "@/hooks/useOrganization";
import type { AssetCategory } from "@/types/organization";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  depreciation_rate: z.string().optional(),
  useful_life_years: z.string().optional(),
  warranty_period_months: z.string().optional(),
  requires_maintenance: z.boolean().optional(),
  maintenance_interval_days: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function parseOptionalInt(v?: string) { const n = parseInt(v ?? ""); return isNaN(n) ? undefined : n; }
function parseOptionalFloat(v?: string) { const n = parseFloat(v ?? ""); return isNaN(n) ? undefined : n; }

export function CategoriesTab() {
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useAssetCategories({ include_inactive: showInactive, search: search || undefined });
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const requiresMaint = watch("requires_maintenance");

  const openCreate = () => { setEditing(null); reset({ name: "", description: "", requires_maintenance: false }); setModalOpen(true); setError(null); };
  const openEdit = (c: AssetCategory) => {
    setEditing(c);
    reset({
      name: c.name, description: c.description ?? "",
      depreciation_rate: c.depreciation_rate?.toString() ?? "",
      useful_life_years: c.useful_life_years?.toString() ?? "",
      warranty_period_months: c.warranty_period_months?.toString() ?? "",
      requires_maintenance: c.requires_maintenance,
      maintenance_interval_days: c.maintenance_interval_days?.toString() ?? "",
    });
    setModalOpen(true); setError(null);
  };

  const onSubmit = async (fd: FormData) => {
    setError(null);
    const payload = {
      name: fd.name,
      description: fd.description || undefined,
      depreciation_rate: parseOptionalFloat(fd.depreciation_rate),
      useful_life_years: parseOptionalInt(fd.useful_life_years),
      warranty_period_months: parseOptionalInt(fd.warranty_period_months),
      requires_maintenance: fd.requires_maintenance ?? false,
      maintenance_interval_days: parseOptionalInt(fd.maintenance_interval_days),
    };
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, payload });
      else await createMut.mutateAsync(payload);
      setModalOpen(false);
    } catch (err) { setError(getApiErrorMessage(err)); }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input type="search" placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          Show inactive
        </label>
        <div className="ml-auto">
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />Add Category</Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Category", "Warranty", "Depreciation", "Life (yrs)", "Maintenance", "Assets", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-200" /></td>
                    ))}
                  </tr>
                ))
              ) : !data?.items.length ? (
                <tr><td colSpan={8}>
                  <EmptyState icon={<Tag className="h-12 w-12" />} title="No categories yet" description="Add asset categories like Electronics, Furniture, Vehicles."
                    action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Category</Button>} />
                </td></tr>
              ) : (
                data.items.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.name}</div>
                      {c.description && <div className="text-xs text-slate-400 truncate max-w-xs">{c.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.warranty_period_months != null ? `${c.warranty_period_months}mo` : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.depreciation_rate != null ? `${c.depreciation_rate}%` : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.useful_life_years ?? "—"}</td>
                    <td className="px-4 py-3">
                      {c.requires_maintenance
                        ? <Badge variant="amber">{c.maintenance_interval_days ? `Every ${c.maintenance_interval_days}d` : "Required"}</Badge>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.asset_count}</td>
                    <td className="px-4 py-3"><Badge variant={c.is_active ? "green" : "red"}>{c.is_active ? "Active" : "Inactive"}</Badge></td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">{data.total} categor{data.total !== 1 ? "ies" : "y"}</div>}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Category" : "Add Category"} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && <Alert variant="error" message={error} />}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input id="cat-name" label="Category Name" placeholder="e.g. Electronics" error={errors.name?.message} {...register("name")} />
            </div>
            <div className="col-span-2">
              <Input id="cat-desc" label="Description (optional)" placeholder="Brief description" {...register("description")} />
            </div>
            <Input id="cat-warranty" label="Warranty Period (months)" type="number" placeholder="e.g. 24" {...register("warranty_period_months")} />
            <Input id="cat-depr" label="Depreciation Rate (%)" type="number" placeholder="e.g. 20" {...register("depreciation_rate")} />
            <Input id="cat-life" label="Useful Life (years)" type="number" placeholder="e.g. 5" {...register("useful_life_years")} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Requires Maintenance</label>
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input type="checkbox" {...register("requires_maintenance")} className="rounded" />
                <span className="text-sm text-slate-600">Yes, schedule maintenance</span>
              </label>
            </div>
            {requiresMaint && (
              <Input id="cat-interval" label="Maintenance Interval (days)" type="number" placeholder="e.g. 90" {...register("maintenance_interval_days")} />
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSaving}>{editing ? "Save Changes" : "Create Category"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
