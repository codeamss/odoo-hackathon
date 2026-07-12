import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Wrench, Package, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";

interface QuickAction {
  label: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  color: string;
  roles?: UserRole[];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Register Asset",
    description: "Add a new asset to the system",
    icon: <Plus className="h-5 w-5" />,
    to: "/assets/new",
    color: "bg-blue-600 hover:bg-blue-700",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    label: "Book Resource",
    description: "Reserve a shared asset by time slot",
    icon: <Calendar className="h-5 w-5" />,
    to: "/bookings/new",
    color: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    label: "Raise Maintenance",
    description: "Report an asset that needs repair",
    icon: <Wrench className="h-5 w-5" />,
    to: "/maintenance/new",
    color: "bg-amber-600 hover:bg-amber-700",
  },
  {
    label: "View All Assets",
    description: "Browse the full asset inventory",
    icon: <Package className="h-5 w-5" />,
    to: "/assets",
    color: "bg-slate-600 hover:bg-slate-700",
  },
];

interface QuickActionsProps {
  userRole: UserRole;
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const navigate = useNavigate();

  const visible = QUICK_ACTIONS.filter(
    (a) => !a.roles || a.roles.includes(userRole)
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {visible.map((action) => (
          <button
            key={action.to}
            onClick={() => navigate(action.to)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3.5 text-left text-white transition-colors",
              action.color
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
              {action.icon}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold">{action.label}</span>
              <span className="block text-xs text-white/70 truncate">
                {action.description}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 opacity-70" />
          </button>
        ))}
      </div>
    </div>
  );
}
