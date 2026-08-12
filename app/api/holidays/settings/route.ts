import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { requireRole } from "@/lib/requireRole";

const DEFAULT_WEEKLY_OFF_DAYS = [0];

function normalizeWeeklyOffDays(input: unknown) {
  if (!Array.isArray(input)) return DEFAULT_WEEKLY_OFF_DAYS;
  const days = Array.from(
    new Set(
      input
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    )
  ).sort((a, b) => a - b);
  return days.length > 0 ? days : DEFAULT_WEEKLY_OFF_DAYS;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const row = await prisma.activityLog.findFirst({
      where: { companyId, action: "COMPANY_HOLIDAY_SETTINGS" },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });

    if (!row?.details) {
      return NextResponse.json({ weeklyOffDays: DEFAULT_WEEKLY_OFF_DAYS });
    }

    try {
      const parsed = JSON.parse(row.details);
      return NextResponse.json({
        weeklyOffDays: normalizeWeeklyOffDays(parsed?.weeklyOffDays),
      });
    } catch {
      return NextResponse.json({ weeklyOffDays: DEFAULT_WEEKLY_OFF_DAYS });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const weeklyOffDays = normalizeWeeklyOffDays(body?.weeklyOffDays);

    await prisma.activityLog.create({
      data: {
        companyId,
        action: "COMPANY_HOLIDAY_SETTINGS",
        userId: req.headers.get("x-user-id") || null,
        details: JSON.stringify({ weeklyOffDays }),
      },
    });

    return NextResponse.json({ ok: true, weeklyOffDays });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
