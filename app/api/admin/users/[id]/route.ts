import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true,
        active: true, createdAt: true,
        companies: { include: { company: { select: { id: true, name: true, plan: true } } } },
      },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = await req.json();
    const data: any = {};
    if (body.role   !== undefined) data.role   = String(body.role).toUpperCase();
    if (body.active !== undefined) data.active  = Boolean(body.active);
    if (body.name   !== undefined) data.name    = body.name;

    const updated = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ success: true, user: { id: updated.id, role: updated.role, active: updated.active } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, companies: { select: { companyId: true }, take: 1 } },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Only block deleting TRUE platform admins — role="ADMIN" with zero
    // companies (e.g. finovaos.app@gmail.com). role="ADMIN" alone isn't
    // enough: every company owner also gets role="ADMIN" on signup, and
    // deleting a company's owner along with the company is normal, expected
    // admin-panel behavior. Checking "zero companies" here is a stable,
    // non-circular signal since it reflects this user's general state, not
    // just the outcome of whatever deletion is in progress.
    if (user.role === "ADMIN" && user.companies.length === 0) {
      return NextResponse.json({ error: "Cannot delete a platform admin from here. Manage admin accounts from Admin Team." }, { status: 403 });
    }

    await Promise.allSettled([
      prisma.session.deleteMany({ where: { userId: id } }),
      prisma.loginLog.deleteMany({ where: { userId: id } }),
      prisma.auditLog.deleteMany({ where: { userId: id } }),
      prisma.activityLog.deleteMany({ where: { userId: id } }),
      prisma.userPermission.deleteMany({ where: { userId: id } }),
      prisma.userCompany.deleteMany({ where: { userId: id } }),
    ]);

    await prisma.user.delete({ where: { id } });

    await logAdminAction({ adminId: (admin as any).id, adminEmail: (admin as any).email, action: "DELETE_USER", targetType: "User", targetId: id, targetLabel: user.email, details: { name: user.name } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
