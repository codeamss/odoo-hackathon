import { useState } from "react";
import { Building2, Tag, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs } from "@/components/ui/Tabs";
import { DepartmentsTab } from "./DepartmentsTab";
import { CategoriesTab } from "./CategoriesTab";
import { EmployeesTab } from "./EmployeesTab";
import { useDepartments, useAssetCategories, useEmployees } from "@/hooks/useOrganization";

const TABS = [
  { key: "departments", label: "Departments", icon: <Building2 className="h-4 w-4" /> },
  { key: "categories",  label: "Asset Categories", icon: <Tag className="h-4 w-4" /> },
  { key: "employees",   label: "Employee Directory", icon: <Users className="h-4 w-4" /> },
];

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState("departments");

  const { data: depts }  = useDepartments();
  const { data: cats }   = useAssetCategories();
  const { data: emps }   = useEmployees();

  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count:
      t.key === "departments" ? depts?.total :
      t.key === "categories"  ? cats?.total :
      emps?.total,
  }));

  return (
    <AppShell title="Organization Setup">
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-slate-900">Organization Setup</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage departments, asset categories, and employee roles.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Tabs tabs={tabsWithCounts} active={activeTab} onChange={setActiveTab} />
        <div className="p-6">
          {activeTab === "departments" && <DepartmentsTab />}
          {activeTab === "categories"  && <CategoriesTab />}
          {activeTab === "employees"   && <EmployeesTab />}
        </div>
      </div>
    </AppShell>
  );
}
