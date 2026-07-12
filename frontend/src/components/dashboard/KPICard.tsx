import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: "blue" | "green" | "amber" | "red" | "purple" | "slate" | "indigo";
  subtitle?: string;
  trend?: { direction: "up" | "down" | "neutral"; label: string };
  isLoading?: boolean;
  onClick?: () => void;
}

const colorMap = {
  blue:   { bg: "from-blue-500 to-blue-600",    ring: "ring-blue-100",   text: "text-blue-600",   iconBg: "bg-blue-50",   iconText: "text-blue-500" },
  green:  { bg: "from-emerald-500 to-emerald-600", ring: "ring-emerald-100", text: "text-emerald-600", iconBg: "bg-emerald-50", iconText: "text-emerald-500" },
  amber:  { bg: "from-amber-500 to-orange-500",  ring: "ring-amber-100",  text: "text-amber-600",  iconBg: "bg-amber-50",  iconText: "text-amber-500" },
  red:    { bg: "from-red-500 to-rose-600",      ring: "ring-red-100",    text: "text-red-600",    iconBg: "bg-red-50",    iconText: "text-red-500" },
  purple: { bg: "from-purple-500 to-indigo-600", ring: "ring-purple-100", text: "text-purple-600", iconBg: "bg-purple-50", iconText: "text-purple-500" },
  indigo: { bg: "from-indigo-500 to-violet-600", ring: "ring-indigo-100", text: "text-indigo-600", iconBg: "bg-indigo-50", iconText: "text-indigo-500" },
  slate:  { bg: "from-slate-500 to-slate-600",   ring: "ring-slate-100",  text: "text-slate-600",  iconBg: "bg-slate-100", iconText: "text-slate-500" },
};

const trendColors = { up: "text-emerald-600", down: "text-red-500", neutral: "text-slate-400" };
const trendIcons = { up: "↑", down: "↓", neutral: "→" };

export function KPICard({ title, value, icon, color, subtitle, trend, isLoading = false, onClick }: KPICardProps) {
  const c = colorMap[color];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-3 w-20 skeleton rounded-full" />
            <div className="h-8 w-16 skeleton rounded-lg" />
            <div className="h-3 w-28 skeleton rounded-full" />
          </div>
          <div className="h-11 w-11 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">{title}</p>
          <p className={cn("mt-1.5 text-3xl font-bold tracking-tight", c.text)}>{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          {trend && (
            <p className={cn("mt-2 flex items-center gap-1 text-xs font-medium", trendColors[trend.direction])}>
              <span>{trendIcons[trend.direction]}</span>
              <span>{trend.label}</span>
            </p>
          )}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", c.iconBg, c.iconText)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
