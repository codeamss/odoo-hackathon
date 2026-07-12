/**
 * Route guard — wraps any route that requires authentication.
 *
 * Behaviour:
 *   - If authenticated: renders the child route.
 *   - If not: redirects to /login, preserving the intended URL in state
 *     so LoginPage can send the user back after a successful login.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { UserRole } from "@/types/auth";
import { useAuthStore } from "@/stores/authStore";

interface ProtectedRouteProps {
  /** Optional list of roles allowed to access this route. */
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" state={{ from: location.pathname }} replace />
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
