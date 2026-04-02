import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";
import { generateSecret, keyuri } from "@/lib/totp";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("sb_auth")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const payload = verifyJwt(token);
  if (!payload?.userId) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
  }

  // Generate TOTP secret
  const secret = generateSecret();
  const appName = "Finova";
  const otpAuthUrl = keyuri(user.email, appName, secret);

  // Store secret temporarily (not yet enabled)
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret },
  });

  return NextResponse.json({ secret, otpAuthUrl });
}
