/**
 * POST /api/admin/companies/impersonate
 * ──────────────────────────────────────────────────────────────────────────────
 * Allows an authenticated admin to log in as the owner of a company
 * for debugging, support, or investigation purposes.
 *
 * - Requires valid admin JWT (via requireAdmin)
 * - Issues a short-lived dashboard JWT for the company owner
 * - Logs the impersonation to AdminActionLog (full audit trail)
 * - Returns { user } for the client to call setCurrentUser()
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { signJwt } from "@/lib/auth";

// In-memory revocation list: set of "adminId:companyId:issuedAt" tokens
// Cleared on server restart — acceptable since impersonation tokens are short-lived (1h)
const revokedTokens = new Set<string>();

export function revokeImpersonation(key: string) {
  revokedTokens.add(key);
}
export function isImpersonationRevoked(key: string) {
  return revokedTokens.has(key);
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify admin identity
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const body = await req.json();
    const { companyId } = body as { companyId?: string };
    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 });
    }

    // 2. Find the company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, isActive: true, subscriptionStatus: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 3. Find the owner (ADMIN role user in this company, else first user)
    const userCompanies = await prisma.userCompany.findMany({
      where: { companyId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (!userCompanies.length) {
      return NextResponse.json({ error: "No users found for this company" }, { status: 404 });
    }

    // Prefer ADMIN role
    const ownerEntry =
      userCompanies.find((uc: any) => uc.user?.role?.toUpperCase() === "ADMIN") ||
      userCompanies[0];
    const owner = (ownerEntry as any).user;

    // 4. Fetch full permissions for the user
    const permRows = await prisma.rolePermission.findMany({
      where: { companyId, role: owner.role },
      select: { permission: true },
    }).catch(() => []);

    // 5. Issue a short-lived JWT (1 hour) for the company user
    const issuedAt = Math.floor(Date.now() / 1000);
    const impersonateToken = signJwt({
      id: owner.id,
      email: owner.email,
      name: owner.name,
      role: owner.role,
      companyId,
      defaultCompanyId: companyId,
      impersonatedBy: admin.id,     // store admin ID, not email (less data exposure in JWT)
      impersonationKey: `${admin.id}:${companyId}:${issuedAt}`,
      exp: issuedAt + 60 * 60,     // 1 hour (reduced from 2h)
    });

    // 6. Audit log — this action is always recorded
    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "IMPERSONATE_USER",
      targetType: "Company",
      targetId: companyId,
      targetLabel: company.name,
      companyId,
      details: {
        impersonatedUserId: owner.id,
        impersonatedUserEmail: owner.email,
        impersonatedUserRole: owner.role,
        companyName: company.name,
      },
    });

    // 7. Build user object (same shape as normal login response)
    const userPayload = {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      role: owner.role,
      companyId,
      defaultCompanyId: companyId,
      companies: [{ id: companyId, name: company.name, role: owner.role }],
      permissions: permRows.map((p: any) => p.permission),
      rolePermissions: permRows,
      impersonatedBy: admin.email,
    };

    // 8. Set a short-lived cookie and return user payload
    const response = NextResponse.json({ success: true, user: userPayload, companyName: company.name });
    response.cookies.set("sb_auth", impersonateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 2 * 60 * 60, // 2 hours
    });
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
