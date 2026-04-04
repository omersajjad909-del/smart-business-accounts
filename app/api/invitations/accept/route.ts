import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getMaxUsersForPlan } from "@/lib/planLimits";

export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json();
    if (!token || !name || !password) {
      return NextResponse.json({ error: "token, name, password required" }, { status: 400 });
    }

    const log = await prisma.activityLog.findFirst({
      where: { action: "INVITE_SENT", details: { contains: token } } as any,
      orderBy: { createdAt: "desc" },
      select: { id: true, details: true },
    } as any);
    if (!log) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });

    let email = "";
    let role = "USER";
    let companyId = "";
    try {
      const d = JSON.parse(log.details || "{}");
      email = d.email || "";
      role = (d.role || "USER").toUpperCase();
      companyId = d.companyId || "";
    } catch {}
    if (!email || !companyId) return NextResponse.json({ error: "Malformed invite" }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    });
    const maxUsers = getMaxUsersForPlan(company?.plan);
    if (maxUsers !== null) {
      const count = await prisma.userCompany.count({ where: { companyId } });
      if (count >= maxUsers) {
        return NextResponse.json({ error: `User limit reached for this company (${maxUsers}).` }, { status: 400 });
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const hash = await bcrypt.hash(password, 10);
    let userId: string;
    if (existing) {
      userId = existing.id;
      await prisma.user.update({ where: { id: userId }, data: { name, role } });
    } else {
      const user = await prisma.user.create({
        data: { name, email: email.toLowerCase(), password: hash, role, active: true },
      } as any);
      userId = user.id;
    }

    try {
      await prisma.userCompany.upsert({
        where: { userId_companyId: { userId, companyId } } as any,
        update: { isDefault: true },
        create: { userId, companyId, isDefault: true },
      } as any);
    } catch {}

    // Set defaultCompanyId so login doesn't fail with "Company context required"
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { defaultCompanyId: companyId } as any,
      });
    } catch {}

    try {
      await prisma.activityLog.create({
        data: { companyId, userId, action: "INVITE_ACCEPTED", details: JSON.stringify({ token }) },
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
