import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

// Get all roles and their permissions
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    // Only users with manage-users permission can access
    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.MANAGE_USERS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      orderBy: { role: "asc" },
    });

    console.log("📊 ALL Role Permissions from DB:", rolePermissions);

    // Group by role
    const roles = ["ADMIN", "ACCOUNTANT", "VIEWER"].map((role: string) => {
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

    // Only users with manage-users permission can modify
    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.MANAGE_USERS
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

    // Delete existing permissions for this role
    await prisma.rolePermission.deleteMany({
      where: { role },
    });

    // Create new permissions
    const createdPermissions = await Promise.all(
      permissions.map((permission: string) =>
        prisma.rolePermission.create({
          data: { role, permission },
        })
      )
    );

    console.log(`✅ Updated ${role} role with ${permissions.length} permissions`);

    return NextResponse.json({
      success: true,
      role,
      permissions: createdPermissions,
    });
  } catch (error: any) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
