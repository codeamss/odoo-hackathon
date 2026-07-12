import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "green" | "red" | "amber" | "blue" | "purple" | "slate";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const styles: Record<BadgeVariant, string> = {
  green:  "bg-emerald-100 text-emerald-700",
  red:    "bg-red-100 text-red-700",
  amber:  "bg-amber-100 text-amber-700",
  blue:   "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  slate:  "bg-slate-100 text-slate-600",
};

export function Badge({ variant = "slate", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
