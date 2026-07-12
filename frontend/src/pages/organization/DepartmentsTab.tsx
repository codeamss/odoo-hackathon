import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, PowerOff, Building2, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { getApiErrorMessage } from "@/lib/axios";
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeactivateDepartment,
} from "@/hooks/useOrganization";
import type { Department } from "@/types/organization";

// ── Form schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Department row ────────────────────────────────────────────────────────────
function DeptRow({
  dept,
  onEdit,
  onDeactivate,
}: {
  dept: Department;
  onEdit: (d: Department) => void;
  onDeactivate: (d: Department) => void;
}) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{dept.name}</div>
        {dept.parent && (
          <div className="text-xs text-slate-400">Under: {dept.parent.name}</div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {dept.description ?? <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {dept.manager ? (
          <div>
            <div className="font-medium">{dept.manager.full_name}</div>
            <div className="text-xs text-slate-400">{dept.manager.email}</div>
          </div>
        ) : (
          <span className="text-slate-300">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          {dept.member_count}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={dept.is_active ? "green" : "red"}>
          {dept.is_active ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(dept)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {dept.is_active && (
            <Button variant="ghost" size="sm" onClick={() => onDeactivate(dept)}>
              <PowerOff className="h-3.5 w-3.5 text-red-500" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export function DepartmentsTab() {
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useDepartments({ include_inactive: showInactive, search: search || undefined });
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deactivateMutation = useDeactivateDepartment();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const openCreate = () => { setEditing(null); reset({ name: "", description: "" }); setModalOpen(true); setError(null); };
  const openEdit = (d: Department) => { setEditing(d); reset({ name: d.name, description: d.description ?? "" }); setModalOpen(true); setError(null); };

  const onSubmit = async (formData: FormData) => {
    setError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setModalOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const onDeactivate = async (d: Department) => {
    if (!window.confirm(`Deactivate department "${d.name}"?`)) return;
    try {
      await deactivateMutation.mutateAsync(d.id);
    } catch (err) {
      alert(getApiErrorMessage(err));
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search departments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          Show inactive
        </label>
        <div className="ml-auto">
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Department
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Name", "Description", "Department Head", "Members", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-200" /></td>
                    ))}
                  </tr>
                ))
              ) : !data?.items.length ? (
                <tr><td colSpan={6}>
                  <EmptyState
                    icon={<Building2 className="h-12 w-12" />}
                    title="No departments yet"
                    description="Create your first department to get started."
                    action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Department</Button>}
                  />
                </td></tr>
              ) : (
                data.items.map((d) => (
                  <DeptRow key={d.id} dept={d} onEdit={openEdit} onDeactivate={onDeactivate} />
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
            {data.total} department{data.total !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Department" : "Add Department"}
        description={editing ? "Update department details." : "Create a new department."}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && <Alert variant="error" message={error} />}
          <Input
            id="dept-name"
            label="Department Name"
            placeholder="e.g. Engineering"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            id="dept-desc"
            label="Description (optional)"
            placeholder="Brief description"
            error={errors.description?.message}
            {...register("description")}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSaving}>
              {editing ? "Save Changes" : "Create Department"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
