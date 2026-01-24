import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";

const prisma =
  (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  const allowed = await apiHasPermission(
    userId,
    userRole,
    PERMISSIONS.VIEW_LOGS
  );

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  return NextResponse.json(logs);
}
