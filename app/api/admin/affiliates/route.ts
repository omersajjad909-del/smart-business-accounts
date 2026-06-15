import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: list all affiliates (admin only)
export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const affiliates = await prisma.affiliate.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { conversions: true, payouts: true } },
      },
    });

    return NextResponse.json({ affiliates });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

// PATCH: approve / reject / update tier
export async function PATCH(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json() as { id: string; status?: string; tier?: string; commissionRate?: number };
    if (!body.id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const tierRates: Record<string, number> = { STARTER: 0.20, GROWTH: 0.25, PRO: 0.30, ELITE: 0.35 };
    const updateData: Record<string, unknown> = {};
    if (body.status) {
      updateData.status = body.status;
      if (body.status === "APPROVED") updateData.approvedAt = new Date();
    }
    if (body.tier) {
      updateData.tier = body.tier;
      updateData.commissionRate = tierRates[body.tier] ?? 0.20;
    }
    if (body.commissionRate !== undefined) updateData.commissionRate = body.commissionRate;

    const affiliate = await prisma.affiliate.update({ where: { id: body.id }, data: updateData });
    return NextResponse.json({ success: true, affiliate });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
