/**
 * Dashboard / Home Screen
 *
 * Layout (desktop):
 *   ┌─────────────────────────────────────────────────────┐
 *   │  KPI Cards row (6 cards)                            │
 *   ├─────────────────────────────┬───────────────────────┤
 *   │  Overdue Returns table      │  Quick Actions        │
 *   ├─────────────────────────────┤  Maintenance Activity │
 *   │  Upcoming Returns table     │  Active Bookings      │
 *   └─────────────────────────────┴───────────────────────┘
 */
import {
  Package,
  CheckSquare,
  Wrench,
  Calendar,
  AlertTriangle,
  Clock,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { KPICard } from "@/components/dashboard/KPICard";
import { ReturnsTable } from "@/components/dashboard/ReturnsTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { MaintenanceActivity } from "@/components/dashboard/MaintenanceActivity";
import { ActiveBookings } from "@/components/dashboard/ActiveBookings";
import { Alert } from "@/components/ui/Alert";
import { useAuthStore } from "@/stores/authStore";
import {
  useKPICards,
  useOverdueReturns,
  useUpcomingReturns,
  useMaintenanceActivity,
  useActiveBookings,
} from "@/hooks/useDashboard";

export default function DashboardPage() {
  const { user } = useAuthStore();

  const kpiQuery = useKPICards();
  const overdueQuery = useOverdueReturns(10);
  const upcomingQuery = useUpcomingReturns(7, 10);
  const maintenanceQuery = useMaintenanceActivity(8);
  const bookingsQuery = useActiveBookings(8);

  const kpi = kpiQuery.data;
  const isKpiLoading = kpiQuery.isLoading;

  // ── KPI card definitions ───────────────────────────────────────────────────
  const kpiCards = [
    {
      title: "Available Assets",
      value: kpi?.assets_available ?? 0,
      icon: <Package className="h-5 w-5" />,
      color: "green" as const,
      subtitle: `of ${kpi?.total_assets ?? 0} total`,
    },
    {
      title: "Allocated Assets",
      value: kpi?.assets_allocated ?? 0,
      icon: <CheckSquare className="h-5 w-5" />,
      color: "blue" as const,
    },
    {
      title: "Under Maintenance",
      value: kpi?.assets_under_maintenance ?? 0,
      icon: <Wrench className="h-5 w-5" />,
      color: "amber" as const,
      subtitle: `${kpi?.maintenance_today ?? 0} new today`,
    },
    {
      title: "Active Bookings",
      value: kpi?.active_bookings ?? 0,
      icon: <Calendar className="h-5 w-5" />,
      color: "purple" as const,
      subtitle: `${kpi?.pending_bookings ?? 0} pending`,
    },
    {
      title: "Overdue Returns",
      value: kpi?.overdue_returns ?? 0,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: (kpi?.overdue_returns ?? 0) > 0 ? ("red" as const) : ("slate" as const),
    },
    {
      title: "Upcoming Returns",
      value: kpi?.upcoming_returns ?? 0,
      icon: <Clock className="h-5 w-5" />,
      color: "amber" as const,
      subtitle: "Next 7 days",
    },
  ];

  return (
    <AppShell title="Dashboard">
      {/* Global error banner */}
      {kpiQuery.isError && (
        <Alert
          variant="error"
          message="Could not load dashboard data. Please refresh."
          className="mb-6"
        />
      )}

      {/* Welcome line */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Good{getTimeOfDay()},{" "}
          <span className="text-blue-600">
            {user?.full_name?.split(" ")[0] ?? "there"}
          </span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s what&apos;s happening across your assets today.
        </p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card) => (
          <KPICard key={card.title} {...card} isLoading={isKpiLoading} />
        ))}
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left column — returns tables */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          <ReturnsTable
            variant="overdue"
            items={overdueQuery.data?.items ?? []}
            total={overdueQuery.data?.total ?? 0}
            isLoading={overdueQuery.isLoading}
          />
          <ReturnsTable
            variant="upcoming"
            items={upcomingQuery.data?.items ?? []}
            total={upcomingQuery.data?.total ?? 0}
            isLoading={upcomingQuery.isLoading}
          />
        </div>

        {/* Right column — actions + activity feeds */}
        <div className="flex flex-col gap-6">
          <QuickActions userRole={user?.role ?? "EMPLOYEE"} />
          <MaintenanceActivity
            items={maintenanceQuery.data?.items ?? []}
            total={maintenanceQuery.data?.total ?? 0}
            isLoading={maintenanceQuery.isLoading}
          />
          <ActiveBookings
            items={bookingsQuery.data?.items ?? []}
            total={bookingsQuery.data?.total ?? 0}
            isLoading={bookingsQuery.isLoading}
          />
        </div>
      </div>
    </AppShell>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
