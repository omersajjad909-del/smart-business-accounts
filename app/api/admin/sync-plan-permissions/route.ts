import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";

/**
 * POST /api/admin/sync-plan-permissions
 *
 * Reads the saved plan-config (or falls back to code defaults) and bulk-updates
 * every user's UserPermission rows so they match the current plan definition.
 *
 * Body: { plans?: string[] }  — optionally restrict to specific plans e.g. ["STARTER"]
 *                               omit to sync ALL plans.
 */
export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const plansToSync: string[] | undefined = body.plans; // e.g. ["STARTER"] or undefined = all

    // ── 1. Load saved plan-config overrides ──────────────────────────────
    let savedPermissions: Record<string, string[]> = {
      STARTER:    PLAN_DEFAULT_PERMISSIONS.STARTER    as string[],
      PRO:        PLAN_DEFAULT_PERMISSIONS.PRO        as string[],
      ENTERPRISE: PLAN_DEFAULT_PERMISSIONS.ENTERPRISE as string[],
      CUSTOM:     [],
    };

    const latest = await prisma.activityLog.findFirst({
      where: { action: "PLAN_CONFIG" },
      orderBy: { createdAt: "desc" },
    });
    if (latest?.details) {
      const saved = JSON.parse(latest.details);
      if (saved?.planPermissions) {
        savedPermissions = { ...savedPermissions, ...saved.planPermissions };
      }
    }

    // ── 2. Normalize plan keys ────────────────────────────────────────────
    // Company.plan is stored as "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | "CUSTOM"
    // planPermissions keys use "PRO" for Professional
    const normalizePlan = (p: string): string => {
      const up = p.toUpperCase();
      if (up === "PROFESSIONAL") return "PRO";
      return up;
    };

    // ── 3. Get all companies (filtered by plan if requested) ─────────────
    const companies = await prisma.company.findMany({
      where: plansToSync
        ? { plan: { in: plansToSync.map(p => p.toUpperCase()) } }
        : undefined,
      select: { id: true, plan: true },
    });

    if (companies.length === 0) {
      return NextResponse.json({ success: true, updated: 0, message: "No companies found for selected plan(s)" });
    }

    // ── 4. For each company, get its users and sync permissions ──────────
    let totalUsersUpdated = 0;
    let totalPermsWritten = 0;

    for (const company of companies) {
      const planKey    = normalizePlan(company.plan);
      const newPerms   = savedPermissions[planKey] || [];

      // Get all users in this company
      const userCompanies = await prisma.userCompany.findMany({
        where: { companyId: company.id },
        select: { userId: true },
      });

      for (const { userId } of userCompanies) {
        // Delete old permissions for this user+company
        await prisma.userPermission.deleteMany({
          where: { userId, companyId: company.id },
        });

        if (newPerms.length > 0) {
          // Re-create with new permissions (deduplicate)
          const uniquePerms = Array.from(new Set(newPerms));
          await prisma.userPermission.createMany({
            data: uniquePerms.map(permission => ({
              userId,
              companyId: company.id,
              permission,
            })),
            skipDuplicates: true,
          });
          totalPermsWritten += uniquePerms.length;
        }
        totalUsersUpdated++;
      }
    }

    // ── 5. Log the sync action ─────────────────────────────────────────────
    await prisma.activityLog.create({
      data: {
        action: "PLAN_PERMISSIONS_SYNCED",
        details: JSON.stringify({
          plansToSync: plansToSync || "ALL",
          companiesAffected: companies.length,
          usersUpdated: totalUsersUpdated,
          permsWritten: totalPermsWritten,
          syncedAt: new Date().toISOString(),
        }),
        userId: null,
        companyId: null,
      },
    });

    return NextResponse.json({
      success: true,
      companiesAffected: companies.length,
      usersUpdated: totalUsersUpdated,
      message: `Synced ${totalUsersUpdated} user(s) across ${companies.length} company(s)`,
    });
  } catch (e: any) {
    console.error("sync-plan-permissions error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
