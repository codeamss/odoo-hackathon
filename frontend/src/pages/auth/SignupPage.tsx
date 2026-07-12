import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuthStore } from "@/stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";
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

// ── Password rules (mirroring backend Zod validator) ──────────────────────────
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

const signupSchema = z
  .object({
    full_name: z
      .string()
      .min(2, "Full name must be at least 2 characters.")
      .max(255),
    email: z.string().email("Please enter a valid email address."),
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

// ── Component ──────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuthStore();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async ({ full_name, email, password }: SignupFormData) => {
    setApiError(null);
    try {
      await signup({ full_name, email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            You&apos;ll be registered as an Employee. Admins can assign
            additional roles later.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            {apiError && <Alert variant="error" message={apiError} />}

            <Input
              id="full_name"
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              error={errors.full_name?.message}
              {...register("full_name")}
            />

            <Input
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a strong password"
              hint="Min. 8 chars with uppercase, lowercase, digit, and special character."
              error={errors.password?.message}
              {...register("password")}
            />

            <Input
              id="confirm_password"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              error={errors.confirm_password?.message}
              {...register("confirm_password")}
            />

            <Button type="submit" isLoading={isLoading} size="lg" className="w-full mt-2">
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
