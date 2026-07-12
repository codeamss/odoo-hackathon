import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const [apiError, setApiError] = useState<string | null>(null);
  const from = (location.state as { from?: string })?.from ?? "/dashboard";

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          <div className="px-8 pt-8 pb-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="mt-1.5 text-sm text-slate-500">Sign in to your AssetFlow account</p>
            </div>

            {apiError && <Alert variant="error" message={apiError} className="mb-5" />}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
              <Input
                id="email" label="Email address" type="email"
                autoComplete="email" placeholder="you@example.com"
                error={errors.email?.message} {...register("email")}
              />
              <div>
                <Input
                  id="password" label="Password" type="password"
                  autoComplete="current-password" placeholder="Your password"
                  error={errors.password?.message} {...register("password")}
                />
                <div className="mt-2 flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button type="submit" isLoading={isLoading} size="lg" className="w-full mt-1">
                Sign In
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don't have an account?{" "}
              <Link to="/signup" className="font-semibold text-blue-600 hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 px-4 py-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
      </div>

      {/* Brand */}
      <div className="mb-8 text-center relative">
        <div className="inline-flex items-center gap-2.5 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
            <Package className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">AssetFlow</span>
        </div>
        <p className="text-sm text-slate-500">Enterprise Asset & Resource Management</p>
      </div>

      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
