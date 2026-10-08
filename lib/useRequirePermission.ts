import { useEffect, useState } from "react";
import { getCurrentUser, USER_CHANGED_EVENT } from "@/lib/auth";
import { hasPermission } from "@/lib/hasPermission";

type PermissionEntry = { permission: string } | string;

type PermissionUser = {
  role?: string;
  permissions?: PermissionEntry[];
  rolePermissions?: PermissionEntry[];
} | null;

/**
 * null while the user isn't known yet, then true/false.
 *
 * This used to read the stored user once, in a memo, at mount. The layout
 * stores the freshly fetched user a moment later (with the role's permissions
 * in it), so the first read could be stale and was never redone.
 */
export function useRequirePermission(permission: string) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => {
      try {
        const user = getCurrentUser() as PermissionUser;
        if (!user) return; // not loaded yet — stay null rather than deny
        setAllowed(hasPermission(user, permission));
      } catch {
        setAllowed(false);
      }
    };
    check();
    window.addEventListener(USER_CHANGED_EVENT, check);
    return () => window.removeEventListener(USER_CHANGED_EVENT, check);
  }, [permission]);

  return allowed;
}
