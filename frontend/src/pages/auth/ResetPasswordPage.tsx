import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";

import { apiClient, getApiErrorMessage } from "@/lib/axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { AuthLayout } from "./LoginPage";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Must contain at least one lowercase letter.")
  .regex(/\d/, "Must contain at least one digit.")
  .regex(
    /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/,
    "Must contain at least one special character."
  );

const schema = z
  .object({
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Guard — no token in URL
  if (!token) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert
              variant="error"
              message="This reset link is invalid or has expired. Please request a new one."
            />
            <Link
              to="/forgot-password"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
              Request a new reset link
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  const onSubmit = async ({ new_password }: FormData) => {
    setIsLoading(true);
    setApiError(null);
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        new_password,
      });
      setSuccess(true);
      // Auto-redirect to login after 2.5 s
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set new password</CardTitle>
          <CardDescription>
            Choose a strong new password for your account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="font-medium text-slate-900">
                Password reset successfully!
              </p>
              <p className="text-sm text-slate-500">
                Redirecting you to Sign In…
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
              noValidate
            >
              {apiError && <Alert variant="error" message={apiError} />}

              <Input
                id="new_password"
                label="New password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                hint="Min. 8 chars with uppercase, lowercase, digit, and special character."
                error={errors.new_password?.message}
                {...register("new_password")}
              />

              <Input
                id="confirm_password"
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your new password"
                error={errors.confirm_password?.message}
                {...register("confirm_password")}
              />

              <Button
                type="submit"
                isLoading={isLoading}
                size="lg"
                className="w-full mt-2"
              >
                Reset Password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
