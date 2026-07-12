import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={inputType}
            className={cn(
              "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900",
              "placeholder:text-slate-400",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50",
              error ? "border-red-400 focus:ring-red-400/30 focus:border-red-400" : "border-slate-200 hover:border-slate-300",
              isPassword && "pr-10",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && (
          <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-xs text-red-500">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${id}-hint`} className="text-xs text-slate-400">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
