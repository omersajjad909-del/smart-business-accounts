import { useMemo } from "react";
import { hasPermission } from "@/lib/hasPermission";

type PermissionEntry = { permission: string } | string;

type PermissionUser = {
  role?: string;
  permissions?: PermissionEntry[];
  rolePermissions?: PermissionEntry[];
} | null;

export function useRequirePermission(permission: string) {
  const allowed = useMemo<boolean | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return false;

      const parsed = JSON.parse(userStr) as unknown;
      let user: PermissionUser = null;

      if (parsed && typeof parsed === "object" && "user" in (parsed as Record<string, unknown>)) {
        user = (parsed as { user: PermissionUser }).user;
      } else {
        user = parsed as PermissionUser;
      }

      if (!user) return false;
      return hasPermission(user, permission);
    } catch {
      return false;
    }
  }, [permission]);

  return allowed;
}
