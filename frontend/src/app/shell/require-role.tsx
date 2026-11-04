import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { hasRole } from "@/lib/permissions";
import type { UserRole } from "@/types/api";
import { ForbiddenPage } from "@/pages/forbidden";

export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  if (!hasRole(user, roles)) {
    return <ForbiddenPage />;
  }
  return <>{children}</>;
}
