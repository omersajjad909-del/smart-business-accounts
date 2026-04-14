/**
 * /api/admin/business-plan-modules
 *
 * GET  — returns saved per-business-per-plan module config
 * POST — saves per-business-per-plan module config
 *
 * Config shape: Record<businessType, Record<"STARTER"|"PRO"|"ENTERPRISE", string[]>>
 * Stored in ActivityLog with action = "BUSINESS_PLAN_MODULES_CONFIG"
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

const ACTION_KEY = "BUSINESS_PLAN_MODULES_CONFIG";

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try {
    const p = verifyJwt(getTokenFromRequest(req as any)!);
    return String(p?.role || "").toUpperCase() === "ADMIN";
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: ACTION_KEY },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    const config = log?.details ? JSON.parse(log.details) : {};
    return NextResponse.json({ config });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { config } = await req.json();
    if (!config || typeof config !== "object") {
      return NextResponse.json({ error: "Invalid config" }, { status: 400 });
    }

    await prisma.activityLog.create({
      data: {
        action: ACTION_KEY,
        details: JSON.stringify(config),
        userId: null,
        companyId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
