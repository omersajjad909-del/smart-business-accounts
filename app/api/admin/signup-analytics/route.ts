import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const logs = await prisma.activityLog.findMany({
    where: { action: "SIGNUP" },
    select: { details: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const referralCounts: Record<string, number> = {};
  const teamSizeCounts: Record<string, number> = {};
  const planCounts: Record<string, number> = {};
  const businessTypeCounts: Record<string, number> = {};
  const signupsByDay: Record<string, number> = {};

  for (const log of logs) {
    try {
      const d = JSON.parse(log.details || "{}");

      const ref = d.referralSource || "Not specified";
      referralCounts[ref] = (referralCounts[ref] || 0) + 1;

      const ts = d.teamSize || "Not specified";
      teamSizeCounts[ts] = (teamSizeCounts[ts] || 0) + 1;

      const plan = d.plan || "unknown";
      planCounts[plan] = (planCounts[plan] || 0) + 1;

      const bt = d.businessType || "unknown";
      businessTypeCounts[bt] = (businessTypeCounts[bt] || 0) + 1;

      const day = log.createdAt.toISOString().slice(0, 10);
      signupsByDay[day] = (signupsByDay[day] || 0) + 1;
    } catch {}
  }

  const toSorted = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));

  return NextResponse.json({
    total: logs.length,
    referralSources: toSorted(referralCounts),
    teamSizes: toSorted(teamSizeCounts),
    plans: toSorted(planCounts),
    businessTypes: toSorted(businessTypeCounts).slice(0, 15),
    signupsByDay: Object.entries(signupsByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, count]) => ({ date, count })),
  });
}
