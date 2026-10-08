import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { apiHasPermission } from "@/lib/apiPermission";
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
    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.MANAGE_USERS,
      companyId
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { companyId },
      orderBy: { role: "asc" },
    });

    console.log("📊 ALL Role Permissions from DB:", rolePermissions);

    // Group by role
    const roles = ["ADMIN", "MANAGER", "ACCOUNTANT", "HR_MANAGER", "SALES", "INVENTORY_MANAGER", "CASHIER", "AUDITOR", "SECURITY", "VIEWER"].map((role: string) => {
      const perms = rolePermissions
        .filter((rp: any) => rp.role === role)
        .map((rp: any) => rp.permission);
      
      console.log(`📌 ${role} permissions:`, perms);
      
      return {
        role,
        permissions: perms,
      };
    });

    console.log("✅ Final response:", roles);

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
    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.MANAGE_USERS,
      companyId
    );

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

    const unique = Array.from(new Set(permissions.filter((p: unknown): p is string => typeof p === "string" && p.length > 0)));

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

