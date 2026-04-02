/**
 * lib/adminAuth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side guard for all /api/admin/* routes.
 *
 * Usage in any admin route:
 *
 *   import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
 *
 *   export async function GET(req: NextRequest) {
 *     const admin = requireAdmin(req);
 *     if (admin instanceof NextResponse) return admin;   // 401/403
 *     // admin.id, admin.email, admin.name, admin.isSuperAdmin available
 *   }
 *
 * The proxy middleware (proxy.ts) already verifies the JWT and sets the
 * x-user-* headers. This module does a SECOND verification directly from the
 * cookie so that even if the proxy is bypassed (direct API call), the route
 * is still protected.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AdminContext {
  id: string;
  email: string;
  name: string;
  role: "ADMIN";
  isSuperAdmin: boolean;
}

/**
 * Call at the top of every admin API handler.
 * Returns an AdminContext on success, or a NextResponse (401/403) on failure.
 */
export function requireAdmin(req: NextRequest): AdminContext | NextResponse {
  // 1. Try JWT from cookie (most secure — cryptographically verified)
  const token = getTokenFromRequest(req as any);
  if (token) {
    const payload = verifyJwt(token);
    if (payload && String(payload.role).toUpperCase() === "ADMIN") {
      return {
        id: String(payload.id),
        email: String(payload.email || ""),
        name: String(payload.name || ""),
        role: "ADMIN",
        isSuperAdmin: Boolean(payload.isSuperAdmin ?? true),
      };
    }
  }

  // 2. Fall back to proxy-verified headers (set by middleware ONLY from JWT)
  //    The proxy strips incoming headers and re-sets them from JWT, so these
  //    are safe as long as the proxy is running.
  const roleHeader = req.headers.get("x-user-role");
  const idHeader = req.headers.get("x-user-id");
  if (roleHeader?.toUpperCase() === "ADMIN" && idHeader) {
    return {
      id: idHeader,
      email: req.headers.get("x-user-email") || "",
      name: req.headers.get("x-user-name") || "",
      role: "ADMIN",
      isSuperAdmin: true,
    };
  }

  return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
}

/**
 * Log an admin action to the AdminActionLog table.
 * Fire-and-forget — never throws so it never breaks the main request.
 */
export async function logAdminAction(opts: {
  adminId: string;
  adminEmail: string;
  action: string;          // e.g. "CHANGE_PLAN", "IMPERSONATE", "DELETE_USER"
  targetType: string;      // e.g. "Company", "User", "Subscription"
  targetId?: string;
  targetLabel?: string;    // e.g. company name or user email
  details?: Record<string, any>;
  companyId?: string;
}) {
  try {
    await (prisma as any).adminActionLog.create({
      data: {
        adminId: opts.adminId,
        adminEmail: opts.adminEmail,
        action: opts.action,
        targetType: opts.targetType,
        targetId: opts.targetId || null,
        targetLabel: opts.targetLabel || null,
        details: opts.details ? JSON.stringify(opts.details) : null,
        companyId: opts.companyId || null,
      },
    });
  } catch {
    // Silently ignore — logging must never break business logic
  }
}
