import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { apiHasPermission, getCompanyPlanPermissions } from "@/lib/apiPermission";
import { defaultsForRole, ROLE_DEFAULT_PERMISSIONS } from "@/lib/roleDefaultPermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId } from "@/lib/tenant";

// Get all roles and their permissions
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    // Only users with manage-users permission can access
    // A company admin always manages their own team: plan gating decides which
    // features the roles can be given, not whether the admin may edit roles
    // (a plan list without MANAGE_USERS 403'd the admin out of this very page).
    const allowed =
      (!!userId && userRole?.toUpperCase() === "ADMIN") ||
      (await apiHasPermission(userId, userRole, PERMISSIONS.MANAGE_USERS, companyId));

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const planPermissions = await getCompanyPlanPermissions(companyId);
    const roleNames = Object.keys(ROLE_DEFAULT_PERMISSIONS);

    // First visit for this company: nothing has ever been saved, so give every
    // role its defaults. Rows are what apiHasPermission reads, so showing
    // defaults without storing them would promise access nobody has.
    if ((await prisma.rolePermission.count({ where: { companyId } })) === 0) {
      await prisma.rolePermission.createMany({
        data: roleNames.flatMap((role) =>
          defaultsForRole(role, planPermissions).map((permission) => ({ role, permission, companyId }))
        ),
        skipDuplicates: true,
      });
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { companyId },
      orderBy: { role: "asc" },
    });

    // Group by role
    const roles = roleNames.map((role: string) => {
      const perms = rolePermissions
        .filter((rp: any) => rp.role === role)
        .map((rp: any) => rp.permission);
      
      return {
        role,
        permissions: perms,
      };
    });

    // ?meta=1 adds what the editor needs to hide out-of-plan permissions and to
    // offer "reset to defaults"; the bare array stays for the other screens.
    if (req.nextUrl.searchParams.get("meta") === "1") {
      return NextResponse.json({
        roles,
        planPermissions,
        defaults: Object.fromEntries(roleNames.map((r) => [r, defaultsForRole(r, planPermissions)])),
      });
    }
    return NextResponse.json(roles);
  } catch (error: any) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Save role permissions
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    // Only users with manage-users permission can modify
    // A company admin always manages their own team: plan gating decides which
    // features the roles can be given, not whether the admin may edit roles
    // (a plan list without MANAGE_USERS 403'd the admin out of this very page).
    const allowed =
      (!!userId && userRole?.toUpperCase() === "ADMIN") ||
      (await apiHasPermission(userId, userRole, PERMISSIONS.MANAGE_USERS, companyId));

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { role, permissions } = body;

    if (!role || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Role and permissions array required" },
        { status: 400 }
      );
    }

    // Only real permission names. Not narrowed to the plan's permission list:
    // what a plan ships is decided by its pages, and a page can be on while its
    // permission isn't in that list — dropping it here made the tick vanish.
    const known = new Set<string>(Object.values(PERMISSIONS));
    const unique = Array.from(new Set(
      permissions.filter((p: unknown): p is string => typeof p === "string" && known.has(p))
    ));

    // One transaction, one bulk insert: 80+ parallel creates exhausted the
    // pooled connection and left the role with its permissions already deleted.
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { role, companyId } }),
      prisma.rolePermission.createMany({
        data: unique.map((permission) => ({ role, permission, companyId })),
        skipDuplicates: true,
      }),
    ]);

    console.log(`✅ Updated ${role} role with ${permissions.length} permissions`);

    return NextResponse.json({
      success: true,
      role,
      permissions: unique,
    });
  } catch (error: any) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

