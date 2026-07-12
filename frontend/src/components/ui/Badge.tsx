import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "green" | "red" | "amber" | "blue" | "purple" | "slate" | "indigo";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const styles: Record<BadgeVariant, string> = {
  green:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  red:    "bg-red-50 text-red-700 ring-1 ring-red-200",
  amber:  "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  blue:   "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  purple: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  slate:  "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
};

const dotStyles: Record<BadgeVariant, string> = {
  green: "bg-emerald-500", red: "bg-red-500", amber: "bg-amber-500",
  blue: "bg-blue-500", purple: "bg-purple-500", slate: "bg-slate-400", indigo: "bg-indigo-500",
};

export function Badge({ variant = "slate", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotStyles[variant])} />}
      {children}
    </span>
  );
}
