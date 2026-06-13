/**
 * /api/admin/page-visibility
 *
 * GET  — returns all dashboard features with hidden/visible status
 * POST — { action: "HIDE", id } | { action: "SHOW", id } | { action: "RESET_ALL" }
 *
 * Storage: ActivityLog with action = "PAGE_VISIBILITY_CONFIG"
 * Hidden feature IDs are stored as a JSON array.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { DASHBOARD_FEATURE_DEFS } from "@/lib/dashboardFeatureRegistry";

const LOG_KEY = "PAGE_VISIBILITY_CONFIG";

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try {
    const p = verifyJwt(getTokenFromRequest(req as any)!);
    return String(p?.role || "").toUpperCase() === "ADMIN";
  } catch { return false; }
}

async function loadHidden(): Promise<string[]> {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: LOG_KEY },
      orderBy: { createdAt: "desc" },
    });
    if (log?.details) return JSON.parse(log.details) as string[];
  } catch {}
  return [];
}

async function saveHidden(hidden: string[]) {
  await prisma.activityLog.create({
    data: { action: LOG_KEY, details: JSON.stringify(hidden) },
  });
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const hidden = new Set(await loadHidden());

  const features = DASHBOARD_FEATURE_DEFS.map(f => ({
    id: f.id,
    label: f.label,
    route: f.route,
    business: f.business,
    businessLabel: f.businessLabel,
    section: f.section,
    businessTypes: f.businessTypes || [f.business],
    hidden: hidden.has(f.id),
  }));

  return NextResponse.json({ features, hiddenCount: hidden.size });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const { action, id } = body;

  if (action === "RESET_ALL") {
    await saveHidden([]);
    return NextResponse.json({ ok: true, hidden: [] });
  }

  const current = await loadHidden();
  const hiddenSet = new Set(current);

  if (action === "HIDE" && id) {
    hiddenSet.add(id);
  } else if (action === "SHOW" && id) {
    hiddenSet.delete(id);
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = Array.from(hiddenSet);
  await saveHidden(updated);
  return NextResponse.json({ ok: true, hidden: updated });
}
