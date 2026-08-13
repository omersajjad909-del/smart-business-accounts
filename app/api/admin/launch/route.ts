/**
 * /api/admin/launch
 *
 * GET  — current status, for the Launch Now card
 * POST — { live: boolean } opens the public site to the world, or pulls it back
 *
 * The flag itself is one ADMIN_SETTING row (see lib/siteStatus.ts). A launch
 * also writes a SITE_LAUNCHED record so there is a permanent, attributable
 * answer to "who launched it, and when".
 */

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { getSiteStatus, SITE_LIVE_KEY } from "@/lib/siteStatus";

function adminFromRequest(req: NextRequest) {
  try {
    const payload = verifyJwt(getTokenFromRequest(req as any)!);
    if (String(payload?.role || "").toUpperCase() !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!adminFromRequest(req) && String(req.headers.get("x-user-role") || "").toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await getSiteStatus(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(req: NextRequest) {
  const admin = adminFromRequest(req);
  // The header check alone is trivially forgeable, so a valid ADMIN token is
  // required here — this endpoint decides whether the product is visible.
  if (!admin?.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const live = body?.live !== false;

    const userId = String(admin.userId);
    const actor = await prisma.user
      .findUnique({ where: { id: userId }, select: { name: true, email: true } })
      .catch(() => null);
    const by = actor?.name || actor?.email || userId;

    const writes: any[] = [
      prisma.activityLog.create({
        data: {
          action: "ADMIN_SETTING",
          userId,
          details: JSON.stringify({ key: SITE_LIVE_KEY, value: live }),
        },
      }),
    ];

    // Only a launch is commemorated. Taking the site down is an operational
    // action and must not overwrite the record of when it first went live.
    if (live) {
      writes.push(
        prisma.activityLog.create({
          data: {
            action: "SITE_LAUNCHED",
            userId,
            details: JSON.stringify({ by, at: Date.now() }),
          },
        }),
      );
    }

    await prisma.$transaction(writes);

    return NextResponse.json({ ...(await getSiteStatus()), justLaunched: live });
  } catch (error: unknown) {
    console.error("SITE LAUNCH ERROR:", error);
    return NextResponse.json({ error: "Failed to update launch status" }, { status: 500 });
  }
}
