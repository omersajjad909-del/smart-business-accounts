import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.MANAGE_USERS, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companies = await prisma.company.findMany({
      where: { id: companyId },
      select: { id: true, name: true, plan: true, subscriptionStatus: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ companies });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
