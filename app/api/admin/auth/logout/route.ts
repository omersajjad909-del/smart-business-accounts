/**
 * POST /api/admin/auth/logout
 *
 * Clears the admin cookies. Pass `{ everywhere: true }` to also bump the
 * account's token version, which invalidates every other live session for
 * that admin immediately (other browsers, other devices).
 */
import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminCookies,
  logAdminAuthEvent,
  requireAdmin,
  revokeAdminSessions,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, { anyPage: true });

  // An expired or already-invalid session still gets its cookies cleared —
  // logging out must never fail.
  const res = NextResponse.json({ success: true });
  clearAdminCookies(res);

  if (admin instanceof NextResponse) return res;

  let everywhere = false;
  try {
    everywhere = Boolean(JSON.parse(await req.text())?.everywhere);
  } catch {}

  if (everywhere) await revokeAdminSessions(admin.id, admin.source);

  await logAdminAuthEvent({
    email: admin.email,
    action: "LOGOUT",
    adminId: admin.id,
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
    details: { everywhere },
  });

  return res;
}
