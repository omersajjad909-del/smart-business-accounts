import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE orphan users — users who have NO company association
export async function POST(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Find all userIds that have at least one company
    const linked = await prisma.userCompany.findMany({ select: { userId: true } });
    const linkedIds = [...new Set(linked.map((u: { userId: string }) => u.userId))];

    // Find users with NO company
    const orphans = await prisma.user.findMany({
      where: { id: { notIn: linkedIds.length > 0 ? linkedIds : ["__none__"] } },
      select: { id: true, name: true, email: true },
    });

    if (orphans.length === 0) {
      return NextResponse.json({ deleted: 0, message: "No orphan users found" });
    }

    const orphanIds = orphans.map((u: { id: string }) => u.id);

    // Clean up related records first
    await prisma.session.deleteMany({ where: { userId: { in: orphanIds } } }).catch(() => {});
    await prisma.loginLog.deleteMany({ where: { userId: { in: orphanIds } } }).catch(() => {});
    await prisma.auditLog.deleteMany({ where: { userId: { in: orphanIds } } }).catch(() => {});
    await prisma.activityLog.deleteMany({ where: { userId: { in: orphanIds } } }).catch(() => {});
    await prisma.userPermission.deleteMany({ where: { userId: { in: orphanIds } } }).catch(() => {});

    // Delete orphan users
    await prisma.user.deleteMany({ where: { id: { in: orphanIds } } });

    return NextResponse.json({
      deleted: orphans.length,
      users: orphans.map((u: { id: string; name: string; email: string }) => ({ id: u.id, name: u.name, email: u.email })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET — just count orphans without deleting
export async function GET(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const linked = await prisma.userCompany.findMany({ select: { userId: true } });
    const linkedIds = [...new Set(linked.map((u: { userId: string }) => u.userId))];

    const count = await prisma.user.count({
      where: { id: { notIn: linkedIds.length > 0 ? linkedIds : ["__none__"] } },
    });

    return NextResponse.json({ orphanCount: count });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
