/**
 * Placeholder dashboard — replaced by the real KPI dashboard in a later feature.
 */
import { useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard } from "lucide-react";

import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-900">
            AssetFlow
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {user?.full_name}{" "}
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {user?.role}
            </span>
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Body */}
      <main className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome, {user?.full_name?.split(" ")[0]}!
        </h1>
        <p className="mt-3 max-w-md text-slate-500">
          The full dashboard is being built. This placeholder confirms your
          authentication is working correctly.
        </p>
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-8 py-6 text-sm text-slate-400">
          Feature screens will appear here as they are built.
        </div>
      </main>
    </div>
  );
}
