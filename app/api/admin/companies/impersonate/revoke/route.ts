/**
 * POST /api/admin/companies/impersonate/revoke
 * Immediately revokes an active impersonation session.
 * Body: { impersonationKey: "adminId:companyId:issuedAt" }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { revokeImpersonation } from "../route";

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const { impersonationKey } = body as { impersonationKey?: string };
  if (!impersonationKey) {
    return NextResponse.json({ error: "impersonationKey required" }, { status: 400 });
  }

  revokeImpersonation(impersonationKey);

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "REVOKE_IMPERSONATION",
    targetType: "ImpersonationSession",
    targetLabel: impersonationKey,
    details: { revokedAt: new Date().toISOString() },
  });

  return NextResponse.json({ success: true, message: "Impersonation session revoked" });
}
