type PermissionEntry = { permission: string } | string;

type PermissionUser = {
  role?: string;
  permissions?: PermissionEntry[];
  rolePermissions?: PermissionEntry[];
} | null;

// export function hasPermission(user: PermissionUser, permissionName: string) {
//   if (!user) return false;

//   if (user.role === "ADMIN") return true;

//   const hasAnyUserPermissions =
//     Array.isArray(user.permissions) && user.permissions.length > 0;

//   const matches = (p: PermissionEntry) =>
//     (typeof p === "object" && "permission" in p && p.permission === permissionName) ||
//     p === permissionName;

//   if (hasAnyUserPermissions) {
//     return user.permissions.some(matches);
//   }

//   if (Array.isArray(user.rolePermissions) && user.rolePermissions.length > 0) {
//     return user.rolePermissions.some(matches);
//   }

//   return false;
// }

export function hasPermission(
  user: PermissionUser,
  permission: string
) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  const allPerms = [
    ...(user.permissions ?? []),
    ...(user.rolePermissions ?? []),
  ].map(p => typeof p === "string" ? p : p.permission);

  return allPerms.includes(permission);
}
