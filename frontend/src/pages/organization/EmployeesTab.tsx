import { useState } from "react";
import { Users, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { getApiErrorMessage } from "@/lib/axios";
import { useEmployees, useUpdateEmployeeRole, useUpdateEmployee } from "@/hooks/useOrganization";
import type { Employee } from "@/types/organization";
import type { UserRole } from "@/types/auth";

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "MANAGER", label: "Manager (Department Head)" },
  { value: "AUDITOR", label: "Auditor" },
  { value: "VIEWER", label: "Viewer (Read-only)" },
];

const ROLE_BADGE: Record<string, "blue" | "purple" | "amber" | "slate" | "green" | "red"> = {
  SUPER_ADMIN: "red", ADMIN: "purple", MANAGER: "blue",
  AUDITOR: "amber", EMPLOYEE: "slate", VIEWER: "slate",
};

export function EmployeesTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [promoting, setPromoting] = useState<Employee | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const params: Record<string, string | boolean> = { include_inactive: showInactive };
  if (search) params.search = search;
  if (roleFilter) params.role = roleFilter;

  const { data, isLoading } = useEmployees(params);
  const roleMut = useUpdateEmployeeRole();
  const userMut = useUpdateEmployee();

  const openPromote = (emp: Employee) => {
    setPromoting(emp);
    setSelectedRole(emp.role);
    setError(null);
  };

  const onSaveRole = async () => {
    if (!promoting || !selectedRole) return;
    setError(null);
    try {
      await roleMut.mutateAsync({ id: promoting.id, role: selectedRole });
      setPromoting(null);
    } catch (err) { setError(getApiErrorMessage(err)); }
  };

  const onToggleActive = async (emp: Employee) => {
    const action = emp.is_active ? "deactivate" : "activate";
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${emp.full_name}?`)) return;
    try {
      await userMut.mutateAsync({ id: emp.id, payload: { is_active: !emp.is_active } });
    } catch (err) { alert(getApiErrorMessage(err)); }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input type="search" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          Show inactive
        </label>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Employee", "Email", "Department", "Role", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-200" /></td>
                    ))}
                  </tr>
                ))
              ) : !data?.items.length ? (
                <tr><td colSpan={6}>
                  <EmptyState icon={<Users className="h-12 w-12" />} title="No employees found"
                    description="Employees appear here after they sign up. Use the role column to promote them." />
                </td></tr>
              ) : (
                data.items.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 uppercase shrink-0">
                          {emp.full_name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp.email}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.department?.name ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_BADGE[emp.role] ?? "slate"}>{emp.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={emp.is_active ? "green" : "red"}>{emp.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {emp.role !== "SUPER_ADMIN" && (
                          <Button variant="outline" size="sm" onClick={() => openPromote(emp)}>
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />Role
                          </Button>
                        )}
                        {emp.role !== "SUPER_ADMIN" && (
                          <Button
                            variant={emp.is_active ? "danger" : "outline"}
                            size="sm"
                            onClick={() => onToggleActive(emp)}
                            isLoading={userMut.isPending}
                          >
                            {emp.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        )}
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
            {data.total} employee{data.total !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Role Promotion Modal */}
      <Modal
        open={!!promoting}
        onClose={() => setPromoting(null)}
        title="Assign Role"
        description={`Change role for ${promoting?.full_name}`}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          {error && <Alert variant="error" message={error} />}
          <Alert
            variant="info"
            message="This is the only place roles can be assigned. Employees cannot self-elevate."
          />
          <Select
            id="role-select"
            label="New Role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            options={ROLE_OPTIONS}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setPromoting(null)}>Cancel</Button>
            <Button onClick={onSaveRole} isLoading={roleMut.isPending}>Save Role</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
