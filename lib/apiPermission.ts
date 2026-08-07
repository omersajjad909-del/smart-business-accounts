import { prisma } from "./prisma";
import { resolvePlanPermissions } from "@/lib/planPermissions";
import { unstable_cache } from "next/cache";

const _getCachedPlanConfig = unstable_cache(
  async () => {
    const latest = await prisma.activityLog.findFirst({
      where: { action: "PLAN_CONFIG", companyId: "system" },
      orderBy: { createdAt: "desc" },
    });
    return latest?.details ? JSON.parse(latest.details) : null;
  },
  ["global-plan-config"],
  { revalidate: 300 }
);

export async function apiHasPermission(
  userId: string | null,
  userRole: string | null,
  permission: string,
  companyId: string | null
) {
  if (!userId || !companyId) return false;

  const isAdmin = userRole?.toUpperCase() === "ADMIN";

  // Platform admins operate outside any tenant — proxy.ts gives them the
  // synthetic "system" company context. Plan gating below would look up a
  // Company row with id "system", find nothing, fall back to STARTER and then
  // gate the platform admin by a *customer* plan. Short-circuit instead: it
  // removes two DB round trips from every single /api/admin/* request, which
  // is what made the whole admin panel feel slow.
  if (isAdmin && companyId === "system") return true;

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
    const cfg = await _getCachedPlanConfig();
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
