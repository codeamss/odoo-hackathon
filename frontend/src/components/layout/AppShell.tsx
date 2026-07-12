import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Users, Building2, Calendar,
  Wrench, ClipboardList, BarChart2, Bell, LogOut, Menu, X,
  ArrowLeftRight, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import type { UserRole } from "@/types/auth";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     to: "/dashboard",     icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Assets",        to: "/assets",        icon: <Package className="h-4 w-4" /> },
  { label: "Allocations",   to: "/allocations",   icon: <ArrowLeftRight className="h-4 w-4" /> },
  { label: "Bookings",      to: "/bookings",      icon: <Calendar className="h-4 w-4" /> },
  { label: "Maintenance",   to: "/maintenance",   icon: <Wrench className="h-4 w-4" /> },
  { label: "Notifications", to: "/notifications", icon: <Bell className="h-4 w-4" /> },
  { label: "Audit",         to: "/audit",         icon: <ClipboardList className="h-4 w-4" />, roles: ["SUPER_ADMIN","ADMIN","AUDITOR"] },
  { label: "Reports",       to: "/reports",       icon: <BarChart2 className="h-4 w-4" />,     roles: ["SUPER_ADMIN","ADMIN","MANAGER","AUDITOR"] },
  { label: "Employees",     to: "/employees",     icon: <Users className="h-4 w-4" />,          roles: ["SUPER_ADMIN","ADMIN","MANAGER"] },
  { label: "Organization",  to: "/organization",  icon: <Building2 className="h-4 w-4" />,      roles: ["SUPER_ADMIN","ADMIN"] },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "from-purple-500 to-indigo-600",
  ADMIN:       "from-blue-500 to-blue-700",
  MANAGER:     "from-emerald-500 to-teal-600",
  AUDITOR:     "from-amber-500 to-orange-600",
  EMPLOYEE:    "from-slate-500 to-slate-700",
  VIEWER:      "from-slate-400 to-slate-600",
};

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const avatarGradient = ROLE_COLORS[user?.role ?? "EMPLOYEE"];
  const initials = user?.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "?";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col",
          "bg-slate-950 border-r border-slate-800/60",
          "transition-transform duration-250 ease-in-out",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-800/60">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
            <Package className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <span className="text-[15px] font-bold text-white tracking-tight">AssetFlow</span>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">Enterprise ERP</p>
          </div>
          <button className="ml-auto text-slate-500 hover:text-white lg:hidden transition-colors" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-800/60 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/50 px-3 py-3 mb-2">
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              "bg-gradient-to-br text-xs font-bold text-white uppercase shadow-sm",
              avatarGradient,
            )}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white leading-tight">{user?.full_name}</p>
              <p className="truncate text-[11px] text-slate-500 leading-tight mt-0.5">{user?.role?.replace("_", " ")}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-500 transition-all hover:bg-red-900/30 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function TopBar({ title, onMenuClick, notificationCount = 0 }: {
  title: string; onMenuClick: () => void; notificationCount?: number;
}) {
  const navigate = useNavigate();
  return (
    <header className="flex h-16 items-center gap-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm px-6 sticky top-0 z-10">
      <button
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => navigate("/notifications")}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

interface AppShellProps {
  title: string;
  children: React.ReactNode;
  notificationCount?: number;
}

export function AppShell({ title, children, notificationCount }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: notifData } = useNotifications({ unread_only: true, limit: 1 });
  const liveCount = notifData?.unread_count ?? notificationCount ?? 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col lg:ml-64">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} notificationCount={liveCount} />
        <main className="flex-1 overflow-y-auto p-6 page-enter">{children}</main>
      </div>
    </div>
  );
}
