import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";
import { verify as verifyTotp } from "@/lib/totp";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("sb_auth")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const payload = verifyJwt(token);
  if (!payload?.userId) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "OTP code required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.twoFactorSecret) {
    return NextResponse.json({ error: "2FA not set up. Call /api/auth/2fa/setup first." }, { status: 400 });
  }

  const isValid = verifyTotp({ token: code, secret: user.twoFactorSecret });
  if (!isValid) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  // Enable 2FA
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  });

  return NextResponse.json({ success: true, message: "2FA enabled successfully" });
}
