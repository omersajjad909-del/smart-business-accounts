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
