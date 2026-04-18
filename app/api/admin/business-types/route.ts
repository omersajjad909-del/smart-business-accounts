import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";
import { ALL_BUSINESS_TYPES } from "@/lib/businessTypes";

const CONFIG_ACTION = "BUSINESS_TYPES_CONFIG";

async function getConfig(): Promise<string[]> {
  const log = await prisma.activityLog.findFirst({
    where: { action: CONFIG_ACTION },
    orderBy: { createdAt: "desc" },
  });
  if (!log?.details) {
    // Default: return all phase-1 liveByDefault IDs
    return ALL_BUSINESS_TYPES.filter(b => b.liveByDefault).map(b => b.id);
  }
  try {
    const parsed = JSON.parse(log.details);
    return Array.isArray(parsed.liveIds) ? parsed.liveIds : [];
  } catch {
    return ALL_BUSINESS_TYPES.filter(b => b.liveByDefault).map(b => b.id);
  }
}

// GET — return all business types with live status
export async function GET(req: NextRequest) {
  const token = req.cookies.get("sb_auth")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyJwt(token);
  if (!payload || !["ADMIN", "SUPERADMIN"].includes(String(payload.role).toUpperCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const liveIds = await getConfig();
  const types = ALL_BUSINESS_TYPES.map(b => ({
    ...b,
    isLive: liveIds.includes(b.id),
  }));

  return NextResponse.json({ types, liveIds });
}

// POST — save updated liveIds list
export async function POST(req: NextRequest) {
  const token = req.cookies.get("sb_auth")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyJwt(token);
  if (!payload || !["ADMIN", "SUPERADMIN"].includes(String(payload.role).toUpperCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const liveIds: string[] = Array.isArray(body.liveIds) ? body.liveIds : [];

  // Validate all IDs exist
  const validIds = new Set(ALL_BUSINESS_TYPES.map(b => b.id));
  const filtered = liveIds.filter(id => validIds.has(id));

  // Store using the same ActivityLog pattern as PLAN_CONFIG
  const companyId = payload.companyId || body.companyId || "system";
  await prisma.activityLog.create({
    data: {
      companyId,
      userId: payload.userId,
      action: CONFIG_ACTION,
      details: JSON.stringify({ liveIds: filtered, updatedAt: new Date().toISOString() }),
    },
  });

  return NextResponse.json({ success: true, liveIds: filtered });
}
