import { type HTMLAttributes } from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "error" | "success" | "info" | "warning";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  message: string;
}

const config: Record<AlertVariant, { classes: string; Icon: typeof AlertCircle }> = {
  error:   { classes: "bg-red-50 border-red-200 text-red-700",          Icon: AlertCircle },
  success: { classes: "bg-emerald-50 border-emerald-200 text-emerald-700", Icon: CheckCircle2 },
  info:    { classes: "bg-blue-50 border-blue-200 text-blue-700",        Icon: Info },
  warning: { classes: "bg-amber-50 border-amber-200 text-amber-700",     Icon: AlertTriangle },
};

export function Alert({ variant = "error", message, className, ...props }: AlertProps) {
  const { classes, Icon } = config[variant];
  return (
    <div
      role="alert"
      className={cn("flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm", classes, className)}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
