/**
 * POST /api/admin/security/unlock  — type the page password, open the locked
 *                                    pages for 30 minutes
 * DELETE                           — close them again immediately ("Lock now")
 *
 * `anyPage: true` on purpose: any signed-in admin who knows the password may
 * unlock, not only a super admin. Skipping the page check here is also what
 * stops this endpoint from being locked behind the very lock it opens.
 */
import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, requireAdmin } from "@/lib/adminAuth";
import { rateLimitAsync } from "@/lib/rateLimit";
import {
  clearUnlockCookie,
  getAdminPageLock,
  mintUnlockToken,
  setUnlockCookie,
  verifyLockPassword,
} from "@/lib/adminPageLock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, { anyPage: true });
  if (admin instanceof NextResponse) return admin;

  // A short password guarded only by a signed-in session still deserves a
  // ceiling on how fast it can be guessed.
  const limit = await rateLimitAsync(`admin_page_unlock:${admin.id}`, 8, 5 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const lock = await getAdminPageLock();
  if (!lock.enabled || !lock.passwordHash) {
    return NextResponse.json({ error: "No page lock is configured" }, { status: 400 });
  }

  let password = "";
  try {
    password = String(JSON.parse(await req.text())?.password || "");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  if (!(await verifyLockPassword(lock, password))) {
    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "ADMIN_PAGE_UNLOCK_FAILED",
      targetType: "AdminSecurity",
      targetLabel: admin.email,
    });
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true, pages: lock.pages });
  setUnlockCookie(res, mintUnlockToken(admin.id, lock));

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "ADMIN_PAGE_UNLOCKED",
    targetType: "AdminSecurity",
    targetLabel: `${lock.pages.length} pages`,
  });

  return res;
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req, { anyPage: true });
  const res = NextResponse.json({ success: true });
  clearUnlockCookie(res);
  if (!(admin instanceof NextResponse)) {
    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "ADMIN_PAGE_RELOCKED",
      targetType: "AdminSecurity",
      targetLabel: admin.email,
    });
  }
  return res;
}
