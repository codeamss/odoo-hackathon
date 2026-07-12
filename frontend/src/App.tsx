/**
 * App root — sets up React Router, TanStack Query, and the auth guard.
 *
 * Route structure:
 *   /                    → redirect to /dashboard
 *   /login               → LoginPage    (public)
 *   /signup              → SignupPage   (public)
 *   /forgot-password     → ForgotPasswordPage (public)
 *   /reset-password      → ResetPasswordPage  (public, needs ?token=)
 *   /unauthorized        → UnauthorizedPage
 *   /dashboard           → DashboardPage (protected)
 *   (future routes will be nested under the protected outlet)
 */
import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/authStore";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import OrganizationPage from "@/pages/organization/OrganizationPage";
import AssetsPage from "@/pages/assets/AssetsPage";

// ── TanStack Query client ──────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Root app ───────────────────────────────────────────────────────────────────
function AppInner() {
  const { loadUser, isAuthenticated } = useAuthStore();

  // On mount, re-validate the stored token and hydrate user profile
  useEffect(() => {
    if (isAuthenticated) {
      loadUser();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/assets" element={<AssetsPage />} />
        </Route>
        <Route
          element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]} />}
        >
          <Route path="/organization" element={<OrganizationPage />} />
        </Route>
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
