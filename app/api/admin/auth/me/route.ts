/**
 * GET /api/admin/auth/me
 *
 * The console's source of truth for "who am I and what may I open". The
 * sidebar used to read this out of sessionStorage, which any visitor could
 * write by hand — the nav it produced was cosmetic. This answers from the
 * signed cookie and a live database row instead.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { SUPER_ADMIN_ONLY_PAGES } from "@/lib/adminPages";
import { UNLOCK_COOKIE, getAdminPageLock, hasValidUnlock } from "@/lib/adminPageLock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, { anyPage: true });
  if (admin instanceof NextResponse) return admin;

  const lock = await getAdminPageLock();
  const unlocked =
    lock.enabled && hasValidUnlock(req.cookies.get(UNLOCK_COOKIE)?.value, admin.id, lock);

  return NextResponse.json({
    lockedPages: lock.enabled ? lock.pages : [],
    unlocked,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: "ADMIN",
      isSuperAdmin: admin.isSuperAdmin,
      allowedPages: admin.allowedPages,
      source: admin.source,
    },
    superAdminOnlyPages: [...SUPER_ADMIN_ONLY_PAGES],
  });
}
