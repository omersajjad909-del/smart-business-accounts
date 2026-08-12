import { prisma } from "./prisma";
import { resolvePlanPermissions } from "@/lib/planPermissions";
import { unstable_cache } from "next/cache";

/**
 * Both plan configs, world and Pakistan, as saved by /admin/plans.
 *
 * This used to filter on `companyId: "system"`. /api/admin/plan-config writes
 * the row with `companyId: null` and nothing in the codebase has ever written
 * "system", so the lookup never matched: every API route below fell back to the
 * hardcoded PLAN_DEFAULT_PERMISSIONS ladder while the sidebar (/api/me/bootstrap,
 * which queries by action alone) honoured the admin's list. The two disagreed —
 * a permission an admin revoked still served data over the API, and one they
 * granted still 403'd.
 */
const _getCachedPlanConfig = unstable_cache(
  async () => {
    const parse = (details?: string | null) => {
      try { return details ? JSON.parse(details) : null; } catch { return null; }
    };
    const [world, pkr] = await Promise.all([
      prisma.activityLog.findFirst({
        where: { action: "PLAN_CONFIG" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }),
      prisma.activityLog.findFirst({
        where: { action: "PKR_PLAN_CONFIG" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }),
    ]);
    return { world: parse(world?.details), pkr: parse(pkr?.details) };
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
      select: { plan: true, activeModules: true, country: true, baseCurrency: true },
    });
    const planCode = String(company?.plan || "STARTER").toUpperCase();
    const cfg = await _getCachedPlanConfig();

    // Same Pakistan test /api/me/bootstrap uses. Plan permissions are
    // currency-specific — /admin/plans keeps a separate PKR list — so gating a
    // PKR company on the world list is the same page showing in the sidebar and
    // 403-ing on its own data.
    const isPkrCompany =
      company?.baseCurrency === "PKR" ||
      String(company?.country || "").toUpperCase() === "PK" ||
      String(company?.country || "").toLowerCase() === "pakistan";

    const perms = resolvePlanPermissions({
      plan: planCode,
      configuredPlanPermissions: cfg?.world?.planPermissions || null,
      activeModules: company?.activeModules || null,
      isPkrUser: isPkrCompany,
      pkrPlanPermissions: cfg?.pkr?.planPermissions || null,
    });
    return perms.includes(permission);
  } catch {
    // If plan-permissions not configured, allow by role/user
    return true;
  }
}
