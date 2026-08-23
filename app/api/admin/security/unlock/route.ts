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
  isPageLocked,
  mintUnlockToken,
  setUnlockCookie,
  verifyLockPassword,
} from "@/lib/adminPageLock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, { anyPage: true });
  if (admin instanceof NextResponse) return admin;

  // `navigator.sendBeacon` can only issue a POST, so the unload path re-locks
  // through this flag rather than the DELETE below.
  if (req.nextUrl.searchParams.get("relock") === "1") {
    const res = NextResponse.json({ success: true });
    clearUnlockCookie(res);
    return res;
  }

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
  let page = "";
  try {
    const body = JSON.parse(await req.text());
    password = String(body?.password || "");
    page = String(body?.page || "");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }
  // One page per unlock. Asking for a page that is not locked would mint a
  // token that opens nothing, so it is rejected rather than silently accepted.
  if (!isPageLocked(lock, page)) {
    return NextResponse.json({ error: "That page is not locked" }, { status: 400 });
  }

  if (!(await verifyLockPassword(lock, password))) {
    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "ADMIN_PAGE_UNLOCK_FAILED",
      targetType: "AdminSecurity",
      targetId: page,
      targetLabel: `${admin.email} → ${page}`,
    });
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true, page });
  setUnlockCookie(res, mintUnlockToken(admin.id, lock, page));

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "ADMIN_PAGE_UNLOCKED",
    targetType: "AdminSecurity",
    targetId: page,
    targetLabel: page,
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
