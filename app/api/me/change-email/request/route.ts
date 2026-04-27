import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHmac, randomInt } from "crypto";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

function authUser(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyJwt(token);
  return payload?.userId ? payload : null;
}

function otpHash(code: string) {
  const secret = process.env.SESSION_SECRET || "dev-insecure-secret";
  return createHmac("sha256", secret).update(code).digest("hex");
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const payload = authUser(req);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const newEmail = String(body?.newEmail || "").trim().toLowerCase();
    const currentPassword = String(body?.currentPassword || "");

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json({ error: "Valid new email is required" }, { status: 400 });
    }
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: String(payload.userId) },
      select: { id: true, name: true, email: true, password: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (newEmail === user.email) {
      return NextResponse.json({ error: "New email is the same as your current email" }, { status: 400 });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const alreadyTaken = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (alreadyTaken) {
      return NextResponse.json({ error: "This email is already registered" }, { status: 400 });
    }

    // Rate limit — max 1 request per 60s
    const recent = await prisma.activityLog.findFirst({
      where: { userId: user.id, action: "EMAIL_CHANGE_OTP" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
      return NextResponse.json({ error: "Please wait before requesting another code" }, { status: 429 });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const exp = Date.now() + 15 * 60 * 1000;

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        companyId: String(payload.companyId || ""),
        action: "EMAIL_CHANGE_OTP",
        details: JSON.stringify({ h: otpHash(code), exp, newEmail }),
      },
    });

    // OTP goes to CURRENT email — only the real account owner can confirm
    await sendEmail({
      to: user.email,
      subject: "Verify your identity — Email change request",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1035;color:#fff;border-radius:16px">
          <h2 style="margin:0 0 8px;font-size:22px">Confirm email change</h2>
          <p style="color:#94a3b8;margin:0 0 8px">You requested to change your FinovaOS account email to:</p>
          <p style="color:#fff;font-weight:700;margin:0 0 24px">${maskEmail(newEmail)}</p>
          <p style="color:#94a3b8;margin:0 0 16px">Enter this code in the app to confirm:</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:12px;text-align:center;padding:20px;background:rgba(99,102,241,.15);border-radius:12px;color:#818cf8;margin-bottom:24px">${code}</div>
          <p style="color:#64748b;font-size:12px">Code expires in 15 minutes. If you did not request this, someone has your password — change it immediately.</p>
        </div>
      `,
    });

    // Notification to new email — just informational, no OTP
    await sendEmail({
      to: newEmail,
      subject: "Email change pending confirmation — FinovaOS",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1035;color:#fff;border-radius:16px">
          <h2 style="margin:0 0 8px;font-size:22px;color:#34d399">Email change requested</h2>
          <p style="color:#94a3b8;margin:0 0 16px">A request was made to link this email address to a FinovaOS account.</p>
          <p style="color:#94a3b8;margin:0">The account owner must verify this change from their current email. If this request is completed, you will receive future login emails here.</p>
          <p style="color:#64748b;font-size:12px;margin-top:16px">If you did not request this, no action is needed — this email address has not been changed yet.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, maskedEmail: maskEmail(user.email) });
  } catch (e: any) {
    console.error("CHANGE EMAIL REQUEST ERROR:", e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
