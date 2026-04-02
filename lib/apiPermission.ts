import { prisma } from "./prisma";
import { resolvePlanPermissions } from "@/lib/planPermissions";

export async function apiHasPermission(
  userId: string | null,
  userRole: string | null,
  permission: string,
  companyId: string | null
) {
  if (!userId || !companyId) return false;

  const isAdmin = userRole?.toUpperCase() === "ADMIN";

  // Determine if allowed by role/user assignment
  let allowedByUserOrRole = isAdmin; // ADMIN always allowed by role

  if (!allowedByUserOrRole) {
    // User-specific permission override
    const userPerm = await prisma.userPermission.findFirst({
      where: { userId, permission, companyId },
    });
    if (userPerm) allowedByUserOrRole = true;
  }

  if (!allowedByUserOrRole && userRole) {
    // Role-based permission (RolePermission table)
    const rolePerm = await prisma.rolePermission.findFirst({
      where: { role: userRole.toUpperCase(), permission, companyId },
    });
    if (rolePerm) allowedByUserOrRole = true;
  }

  if (!allowedByUserOrRole) return false;

  // Plan-based permission gating — applied for all roles including ADMIN
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true, activeModules: true },
    });
    const planCode = String(company?.plan || "STARTER").toUpperCase();
    const latest = await prisma.activityLog.findFirst({
      where: { action: "PLAN_CONFIG", companyId: "system" },
      orderBy: { createdAt: "desc" },
    });
    const cfg = latest?.details ? JSON.parse(latest.details) : null;
    const perms = resolvePlanPermissions({
      plan: planCode,
      configuredPlanPermissions: cfg?.planPermissions || null,
      activeModules: company?.activeModules || null,
    });
    return perms.includes(permission);
  } catch {
    // If plan-permissions not configured, allow by role/user
    return true;
  }
}
