/**
 * GET  /api/admin/security  — read the page-lock configuration
 * POST /api/admin/security  — save it
 *
 * Super admin only, and the password itself is never returned — only whether
 * one is set. Saving invalidates every unlock anyone is currently holding,
 * because the fingerprint baked into their token stops matching.
 */
import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, requireSuperAdmin } from "@/lib/adminAuth";
import { NEVER_LOCKABLE, getAdminPageLock, saveAdminPageLock } from "@/lib/adminPageLock";
import { SUPER_ADMIN_ONLY_PAGES } from "@/lib/adminPages";
import { ADMIN_NAV_ITEMS } from "@/app/admin/admin-nav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only real pages can be locked, and never the lock screen itself. */
const LOCKABLE_PAGE_IDS = new Set(
  ADMIN_NAV_ITEMS.map((i) => i.id).filter((id) => !NEVER_LOCKABLE.has(id)),
);

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const lock = await getAdminPageLock();
  return NextResponse.json({
    enabled: lock.enabled,
    pages: lock.pages,
    passwordSet: Boolean(lock.passwordHash),
    updatedAt: lock.updatedAt,
    updatedByEmail: lock.updatedByEmail,
    lockablePages: ADMIN_NAV_ITEMS.filter((i) => LOCKABLE_PAGE_IDS.has(i.id)).map((i) => ({
      id: i.id,
      label: i.label,
      group: i.group,
      superAdminOnly: SUPER_ADMIN_ONLY_PAGES.has(i.id),
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (admin instanceof NextResponse) return admin;

  let body: any;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const existing = await getAdminPageLock();

  const password = typeof body?.password === "string" ? body.password.trim() : "";
  if (password && password.length < 6) {
    return NextResponse.json(
      { error: "Page password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const pages = (Array.isArray(body?.pages) ? body.pages.map(String) : []).filter((p: string) =>
    LOCKABLE_PAGE_IDS.has(p),
  );
  const enabled = body?.enabled === true;

  if (enabled && !password && !existing.passwordHash) {
    return NextResponse.json(
      { error: "Set a password before turning the lock on" },
      { status: 400 },
    );
  }
  if (enabled && pages.length === 0) {
    return NextResponse.json({ error: "Pick at least one page to lock" }, { status: 400 });
  }

  const saved = await saveAdminPageLock({
    enabled,
    pages,
    password: password || null,
    existingHash: existing.passwordHash,
    updatedByEmail: admin.email,
    updatedById: admin.id,
  });

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "ADMIN_PAGE_LOCK_UPDATED",
    targetType: "AdminSecurity",
    targetLabel: saved.enabled ? `${saved.pages.length} pages locked` : "lock off",
    // The password is never logged — only the fact that it changed.
    details: { enabled: saved.enabled, pages: saved.pages, passwordChanged: Boolean(password) },
  });

  return NextResponse.json({
    success: true,
    enabled: saved.enabled,
    pages: saved.pages,
    passwordSet: Boolean(saved.passwordHash),
    updatedAt: saved.updatedAt,
    updatedByEmail: saved.updatedByEmail,
  });
}

/** DELETE — remove the lock entirely (password included). */
export async function DELETE(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (admin instanceof NextResponse) return admin;

  await saveAdminPageLock({
    enabled: false,
    pages: [],
    password: null,
    existingHash: null, // dropping the hash is the point
    updatedByEmail: admin.email,
    updatedById: admin.id,
  });

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "ADMIN_PAGE_LOCK_REMOVED",
    targetType: "AdminSecurity",
    targetLabel: "lock removed",
  });

  return NextResponse.json({ success: true });
}
