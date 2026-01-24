import { PERMISSIONS } from "./permissions";

type User = {
  role?: string;
  permissions?: { permission: string }[];
};

export function hasPermission(
  user: User | null,
  permission: keyof typeof PERMISSIONS | string
): boolean {
  if (!user) return false;

  // 🔑 ADMIN = GOD MODE
  if (user.role === "ADMIN") return true;

  if (!Array.isArray(user.permissions)) return false;

  return user.permissions.some(p => p.permission === permission);
}
