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

    // Send OTP to new email
    await sendEmail({
      to: newEmail,
      subject: "Confirm your new email — FinovaOS",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1035;color:#fff;border-radius:16px">
          <h2 style="margin:0 0 8px;font-size:22px">Verify your new email</h2>
          <p style="color:#94a3b8;margin:0 0 24px">Someone requested to change a FinovaOS account email to this address. Use the code below to confirm.</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:12px;text-align:center;padding:20px;background:rgba(99,102,241,.15);border-radius:12px;color:#818cf8;margin-bottom:24px">${code}</div>
          <p style="color:#64748b;font-size:12px">This code expires in 15 minutes. If you did not request this, ignore this email.</p>
        </div>
      `,
    });

    // Security alert to old email
    await sendEmail({
      to: user.email,
      subject: "Email change requested — FinovaOS",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1035;color:#fff;border-radius:16px">
          <h2 style="margin:0 0 8px;font-size:22px;color:#f59e0b">Security Alert</h2>
          <p style="color:#94a3b8;margin:0 0 16px">A request was made to change the email on your FinovaOS account to <strong style="color:#fff">${maskEmail(newEmail)}</strong>.</p>
          <p style="color:#94a3b8;margin:0">If this was you, verify the new email to complete the change. If not, your password may be compromised — change it immediately.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, maskedEmail: maskEmail(newEmail) });
  } catch (e: any) {
    console.error("CHANGE EMAIL REQUEST ERROR:", e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
