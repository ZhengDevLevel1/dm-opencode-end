import type { UserRole, UserVO } from "@/types/api";

export type AppAction =
  | "cart:write"
  | "order:create"
  | "order:cancel"
  | "order:after-sale"
  | "review:create"
  | "staff:fulfill"
  | "staff:inventory"
  | "admin:manage"
  | "admin:stats";

export function isAuthenticated(user: UserVO | null): boolean {
  return Boolean(user);
}

export function hasRole(user: UserVO | null, roles: UserRole[]): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" && roles.includes("STAFF")) return true;
  return roles.includes(user.role);
}

export function can(user: UserVO | null, action: AppAction): boolean {
  if (!user) return false;
  switch (action) {
    case "cart:write":
    case "order:create":
    case "order:cancel":
    case "order:after-sale":
    case "review:create":
      return true;
    case "staff:fulfill":
    case "staff:inventory":
      return user.role === "STAFF" || user.role === "ADMIN";
    case "admin:manage":
    case "admin:stats":
      return user.role === "ADMIN";
    default:
      return false;
  }
}

export function defaultLandingFor(role?: UserRole | null): string {
  if (role === "ADMIN") return "/admin";
  if (role === "STAFF") return "/staff/orders";
  return "/";
}
