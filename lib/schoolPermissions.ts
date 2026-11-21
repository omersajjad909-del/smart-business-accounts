import { prisma } from "@/lib/prisma";
import { defaultsForRole, ROLE_DEFAULT_PERMISSIONS } from "@/lib/roleDefaultPermissions";
import { apiHasPermission, getCompanyPlanPermissions } from "@/lib/apiPermission";

/**
 * RolePermission rows are what the permission checks read, and a company's rows were written
 * before the school keys existed. So the first time a role is checked in a school, its school
 * presets (lib/roleDefaultPermissions.ts) are written once; after that the table is the truth
 * and the admin can change it on the Roles & Permissions page like any other permission.
 *
 * A role that holds no school permission at all has no presets and is simply denied.
 */
export async function ensureSchoolRolePermissions(companyId: string, role: string): Promise<void> {
  const r = role.toUpperCase();
  if (r === "ADMIN") return;
  const presets = ROLE_DEFAULT_PERMISSIONS[r] ?? [];
  if (!presets.some((p) => p.startsWith("SCHOOL_"))) return;

  const rows = await prisma.rolePermission.findMany({ where: { companyId, role: r }, select: { permission: true } });
  if (rows.some((x) => x.permission.startsWith("SCHOOL_"))) return;

  // A role that is new to this company (Principal, Office Clerk…) has no rows at all, so it needs its
  // whole preset — the dashboard permission included. A role that already has rows only lacks the school keys.
  const plan = rows.length === 0 ? await getCompanyPlanPermissions(companyId) : null;
  const wanted = rows.length === 0 ? defaultsForRole(r, plan) : presets.filter((p) => p.startsWith("SCHOOL_"));
  await prisma.rolePermission.createMany({ data: wanted.map((permission) => ({ companyId, role: r, permission })), skipDuplicates: true });
}

export async function schoolHasPermission(userId: string | null, role: string | null, permission: string, companyId: string): Promise<boolean> {
  if (!userId || !role) return false;
  await ensureSchoolRolePermissions(companyId, role);
  return apiHasPermission(userId, role, permission, companyId);
}
