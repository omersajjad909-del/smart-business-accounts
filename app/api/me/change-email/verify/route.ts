import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function POST(req: NextRequest) {
  try {
    const payload = authUser(req);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otp } = await req.json();
    if (!otp || String(otp).length !== 6) {
      return NextResponse.json({ error: "6-digit OTP required" }, { status: 400 });
    }

    // Find latest pending OTP for this user
    const log = await prisma.activityLog.findFirst({
      where: { userId: String(payload.userId), action: "EMAIL_CHANGE_OTP" },
      orderBy: { createdAt: "desc" },
      select: { id: true, details: true, createdAt: true },
    });

    if (!log || !log.details) {
      return NextResponse.json({ error: "No email change request found. Please start over." }, { status: 400 });
    }

    let parsed: { h: string; exp: number; newEmail: string };
    try {
      parsed = JSON.parse(log.details);
    } catch {
      return NextResponse.json({ error: "Invalid request. Please start over." }, { status: 400 });
    }

    if (Date.now() > parsed.exp) {
      return NextResponse.json({ error: "OTP has expired. Please request a new code." }, { status: 400 });
    }

    if (otpHash(String(otp).trim()) !== parsed.h) {
      return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
    }

    // Double-check new email not taken (race condition guard)
    const taken = await prisma.user.findUnique({ where: { email: parsed.newEmail }, select: { id: true } });
    if (taken) {
      return NextResponse.json({ error: "This email was just registered by another account." }, { status: 400 });
    }

    // Update email
    await prisma.user.update({
      where: { id: String(payload.userId) },
      data: { email: parsed.newEmail },
    });

    // Invalidate all sessions for this user so they must re-login with new email
    await prisma.session.deleteMany({ where: { userId: String(payload.userId) } });

    // Clean up the OTP log
    await prisma.activityLog.deleteMany({
      where: { userId: String(payload.userId), action: "EMAIL_CHANGE_OTP" },
    });

    return NextResponse.json({ ok: true, newEmail: parsed.newEmail });
  } catch (e: any) {
    console.error("CHANGE EMAIL VERIFY ERROR:", e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
