import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("sb_auth")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const payload = verifyJwt(token);
  if (!payload?.userId) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const { password } = await req.json();
  if (!password) return NextResponse.json({ error: "Password required to disable 2FA" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  return NextResponse.json({ success: true, message: "2FA disabled" });
}
