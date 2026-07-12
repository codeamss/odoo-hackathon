/**
 * AppShell — persistent layout wrapper for all authenticated pages.
 *
 * Structure:
 *   ┌─────────────────────────────────────────┐
 *   │  Sidebar (fixed, 240px)  │  Main area   │
 *   │  - Logo                  │  - TopBar    │
 *   │  - Nav links             │  - <Outlet/> │
 *   └─────────────────────────────────────────┘
 *
 * Sidebar collapses to icon-only on screens < lg.
 */
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  Calendar,
  Wrench,
  ClipboardList,
  BarChart2,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/types/auth";

// ── Nav items ─────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles?: UserRole[]; // undefined = visible to all
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Assets",
    to: "/assets",
    icon: <Package className="h-4 w-4" />,
  },
  {
    label: "Allocations",
    to: "/allocations",
    icon: <ChevronRight className="h-4 w-4" />,
  },
  {
    label: "Bookings",
    to: "/bookings",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    label: "Maintenance",
    to: "/maintenance",
    icon: <Wrench className="h-4 w-4" />,
  },
  {
    label: "Audit",
    to: "/audit",
    icon: <ClipboardList className="h-4 w-4" />,
    roles: ["SUPER_ADMIN", "ADMIN", "AUDITOR"],
  },
  {
    label: "Reports",
    to: "/reports",
    icon: <BarChart2 className="h-4 w-4" />,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "AUDITOR"],
  },
  {
    label: "Employees",
    to: "/employees",
    icon: <Users className="h-4 w-4" />,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    label: "Organization",
    to: "/organization",
    icon: <Building2 className="h-4 w-4" />,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    label: "Settings",
    to: "/settings",
    icon: <Settings className="h-4 w-4" />,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-slate-900 transition-transform duration-200",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-700/50 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Package className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white">AssetFlow</span>
          <button
            className="ml-auto text-slate-400 hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-0.5" role="list">
            {visibleItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-700/50 px-3 py-4">
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white uppercase">
              {user?.full_name?.charAt(0) ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user?.full_name}
              </p>
              <p className="truncate text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────

function TopBar({
  title,
  onMenuClick,
  notificationCount = 0,
}: {
  title: string;
  onMenuClick: () => void;
  notificationCount?: number;
}) {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6">
      <button
        className="text-slate-500 hover:text-slate-700 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        {/* Notifications bell — wired up in notifications feature */}
        <button
          className="relative text-slate-500 hover:text-slate-700"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────

interface AppShellProps {
  title: string;
  children: React.ReactNode;
  notificationCount?: number;
}

export function AppShell({ title, children, notificationCount }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content — offset by sidebar width on desktop */}
      <div className="flex flex-1 flex-col lg:ml-60">
        <TopBar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
          notificationCount={notificationCount}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
