type PermissionEntry = { permission: string } | string;

export type PermissionUser = {
  role?: string;
  permissions?: PermissionEntry[];
  rolePermissions?: PermissionEntry[];
} | null;

/**
 * Check if user has a specific permission
 * @param user - User object with role and permissions
 * @param permission - Permission string to check
 * @returns boolean - true if user has permission
 * 
 * Priority:
 * 1. ADMIN role = all permissions
 * 2. User-specific permissions (highest priority)
 * 3. Role-based permissions
 */
export function hasPermission(
  user: PermissionUser,
  permission: string
): boolean {
  // No user = no permissions
  if (!user) return false;
  
  // ADMIN role has all permissions
  if (user.role?.toUpperCase() === "ADMIN") return true;

  // Combine all permissions (user-specific + role-based)
  const allPerms = [
    ...(user.permissions ?? []),
    ...(user.rolePermissions ?? []),
  ].map(p => typeof p === "string" ? p : p.permission);

  // Check if permission exists in combined list
  return allPerms.includes(permission);
}

/**
 * Check if user has ANY of the given permissions
 * @param user - User object
 * @param permissions - Array of permission strings
 * @returns boolean - true if user has at least one permission
 */
export function hasAnyPermission(
  user: PermissionUser,
  permissions: string[]
): boolean {
  if (!user) return false;
  if (user.role?.toUpperCase() === "ADMIN") return true;
  
  return permissions.some(perm => hasPermission(user, perm));
}

/**
 * Check if user has ALL of the given permissions
 * @param user - User object
 * @param permissions - Array of permission strings
 * @returns boolean - true if user has all permissions
 */
export function hasAllPermissions(
  user: PermissionUser,
  permissions: string[]
): boolean {
  if (!user) return false;
  if (user.role?.toUpperCase() === "ADMIN") return true;
  
  return permissions.every(perm => hasPermission(user, perm));
}
