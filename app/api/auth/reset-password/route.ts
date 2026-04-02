import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function safeJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "unknown")
      .split(",")[0]
      .trim();
    const rl = rateLimit(`reset-password:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a moment." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const tokenHash = hashResetToken(token);
    const resetLog = await prisma.activityLog.findFirst({
      where: {
        action: "PASSWORD_RESET_REQUESTED",
        details: { contains: tokenHash } satisfies Prisma.StringNullableFilter,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        companyId: true,
        details: true,
        createdAt: true,
      },
    });

    if (!resetLog?.userId) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    const details = safeJson(resetLog.details);
    const storedHash = String(details?.tokenHash || "");
    const expiresAt = Number(details?.exp || 0);
    const usedAt = Number(details?.usedAt || 0);

    if (storedHash !== tokenHash || !expiresAt || Date.now() > expiresAt || usedAt) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: resetLog.userId },
      select: { id: true, active: true },
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.activityLog.update({
        where: { id: resetLog.id },
        data: {
          details: JSON.stringify({
            ...details,
            usedAt: Date.now(),
          }),
        },
      }),
      prisma.activityLog.deleteMany({
        where: {
          userId: user.id,
          action: "PASSWORD_RESET_REQUESTED",
          id: { not: resetLog.id },
        },
      }),
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reset password",
      },
      { status: 500 },
    );
  }
}
