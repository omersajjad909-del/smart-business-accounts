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
import { requireAdmin } from "@/lib/adminAuth";
import { getSiteStatus, SITE_LIVE_KEY } from "@/lib/siteStatus";

/**
 * ActivityLog.userId is a foreign key into User, but an admin session is not
 * necessarily a User: super admins are User rows, while team members live in
 * AdminUser. Writing a team member's id straight into the column fails the
 * constraint, so the id is only kept when it really is a User. The human-
 * readable actor is recorded in `details` either way.
 */
async function userIdIfReal(id: string): Promise<string | null> {
  const user = await prisma.user
    .findUnique({ where: { id }, select: { id: true } })
    .catch(() => null);
  return user?.id ?? null;
}

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  return NextResponse.json(await getSiteStatus(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await req.json().catch(() => ({}));
    const live = body?.live !== false;

    const by = admin.name || admin.email || admin.id;
    const userId = await userIdIfReal(admin.id);

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
