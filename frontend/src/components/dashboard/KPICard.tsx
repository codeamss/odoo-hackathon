import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: "blue" | "green" | "amber" | "red" | "purple" | "slate";
  subtitle?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    label: string;
  };
  isLoading?: boolean;
}

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    icon: "bg-blue-100 text-blue-600",
    value: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
  green: {
    bg: "bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-600",
    value: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "bg-amber-100 text-amber-600",
    value: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
  red: {
    bg: "bg-red-50",
    icon: "bg-red-100 text-red-600",
    value: "text-red-700",
    badge: "bg-red-100 text-red-700",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "bg-purple-100 text-purple-600",
    value: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
  },
  slate: {
    bg: "bg-slate-50",
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-700",
    badge: "bg-slate-100 text-slate-700",
  },
};

const trendColors = {
  up: "text-emerald-600",
  down: "text-red-600",
  neutral: "text-slate-500",
};

const trendIcons = {
  up: "↑",
  down: "↓",
  neutral: "→",
};

export function KPICard({
  title,
  value,
  icon,
  color,
  subtitle,
  trend,
  isLoading = false,
}: KPICardProps) {
  const c = colorMap[color];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={cn("mt-1 text-3xl font-bold", c.value)}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
          {trend && (
            <p className={cn("mt-2 text-xs font-medium", trendColors[trend.direction])}>
              {trendIcons[trend.direction]} {trend.label}
            </p>
          )}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", c.icon)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
