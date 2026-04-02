import { useMemo } from "react";
import { getCurrentUser } from "@/lib/auth";
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
      const user = getCurrentUser() as PermissionUser;
      if (!user) return false;
      return hasPermission(user, permission);
    } catch {
      return false;
    }
  }, [permission]);

  return allowed;
}
