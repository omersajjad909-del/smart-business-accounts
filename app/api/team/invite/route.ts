import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { getEffectiveUserLimitForCompany } from "@/lib/companySeatLimit";

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req as any);
    const payload = token ? verifyJwt(token) : null;
    const roleHeader = String(req.headers.get("x-user-role") || "").toUpperCase();
    const requesterRole = roleHeader || String(payload?.role || "").toUpperCase();
    if (requesterRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = (req.headers.get("x-company-id") || payload?.companyId || "").toString();
    const userId = (req.headers.get("x-user-id") || payload?.userId || "").toString();
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { email, role } = await req.json();
    if (!email || !role) {
      return NextResponse.json({ error: "Email and role required" }, { status: 400 });
    }
    const emailNormalized = String(email).trim().toLowerCase();

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

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const details = { token: inviteToken, email: emailNormalized, role: String(role).toUpperCase(), companyId };

    await prisma.activityLog.create({
      data: { companyId, userId, action: "INVITE_SENT", details: JSON.stringify(details) },
    });

    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const inviteLink = `${base}/onboarding/accept-invite?token=${encodeURIComponent(inviteToken)}`;
    const mail = await sendEmail({
      to: emailNormalized,
      subject: "You're invited to FinovaOS",
      html: `<p>You have been invited to join FinovaOS as <b>${details.role}</b>.</p>
        <p>Click the link below to accept and set your password:</p>
        <p><a href="${inviteLink}">${inviteLink}</a></p>`,
      companyId,
    });

    return NextResponse.json({ ok: true, inviteLink, emailSent: mail.success, emailError: mail.success ? undefined : mail.error });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
