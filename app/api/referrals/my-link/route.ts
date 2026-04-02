import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

function genCode(): string {
  return randomBytes(4).toString("hex").toUpperCase(); // e.g. "A1B2C3D4"
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, referralCode: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Generate referral code if none exists
    if (!user.referralCode) {
      let code = genCode();
      // ensure uniqueness
      let attempts = 0;
      while (attempts < 5) {
        const existing = await prisma.user.findUnique({ where: { referralCode: code } });
        if (!existing) break;
        code = genCode();
        attempts++;
      }
      user = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { id: true, name: true, referralCode: true },
      });
    }

    // Get referral stats
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, refereeEmail: true, status: true, reward: true, createdAt: true, convertedAt: true },
    });

    const stats = {
      total:     referrals.length,
      signed_up: referrals.filter(r => r.status === "signed_up" || r.status === "converted").length,
      converted: referrals.filter(r => r.status === "converted").length,
      rewards:   referrals.filter(r => r.status === "converted").reduce((s, r) => s + (r.reward || 0), 0),
    };

    return NextResponse.json({ referralCode: user.referralCode, stats, referrals });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
