import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);

    if (!userId || !userRole || !companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userPermissions, rolePermissions] = await Promise.all([
      prisma.userPermission.findMany({
        where: { userId, companyId },
        select: { permission: true },
      }),
      prisma.rolePermission.findMany({
        where: { role: userRole, companyId },
        select: { permission: true },
      }),
    ]);

    return NextResponse.json({
      role: userRole,
      permissions: userPermissions.map((p) => p.permission),
      rolePermissions: rolePermissions.map((p) => p.permission),
    });
  } catch (error) {
    console.error("ME PERMISSIONS ERROR:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
