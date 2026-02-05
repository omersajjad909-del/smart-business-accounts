import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId } from "@/lib/tenant";

const prisma =
  (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  const companyId = await resolveCompanyId(req);
  const allowed = await apiHasPermission(
    userId,
    userRole,
    PERMISSIONS.VIEW_LOGS,
    companyId
  );

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const logs = await prisma.activityLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  return NextResponse.json(logs);
}
