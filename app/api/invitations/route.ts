import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getRuntimeAppUrl } from "@/lib/domains";
import { getEffectiveUserLimitForCompany } from "@/lib/companySeatLimit";

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req as any);
    const payload = token ? verifyJwt(token) : null;
    const role = String(req.headers.get("x-user-role") || payload?.role || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const userId = (req.headers.get("x-user-id") || payload?.userId || "").toString();
    const companyId = (req.headers.get("x-company-id") || payload?.companyId || "").toString();
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { email, inviteRole } = await req.json();
    if (!email || !inviteRole) return NextResponse.json({ error: "email and inviteRole required" }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    });
    const maxUsers = await getEffectiveUserLimitForCompany(companyId, company?.plan);
    if (maxUsers !== null) {
      const count = await prisma.userCompany.count({ where: { companyId } });
      if (count >= maxUsers) {
        return NextResponse.json({ error: `User limit reached for your plan (${maxUsers}).` }, { status: 400 });
      }
    }

    const tokenStr = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const details = { token: tokenStr, email, role: String(inviteRole).toUpperCase(), companyId };

    await prisma.activityLog.create({
      data: { companyId, userId, action: "INVITE_SENT", details: JSON.stringify(details) },
    });

    const base = getRuntimeAppUrl(req.nextUrl.origin);
    const url = `${base}/onboarding/accept-invite?token=${encodeURIComponent(tokenStr)}`;
    const html = `<p>You have been invited to join FinovaOS as <b>${details.role}</b>.</p>
      <p>Click the link below to accept and set your password:</p>
      <p><a href="${url}">${url}</a></p>`;
    try {
      await sendEmail({ to: email, subject: "You're invited to FinovaOS", html, companyId });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
