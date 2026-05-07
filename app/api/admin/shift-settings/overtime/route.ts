import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { getCompanyAdminControlSettings, saveCompanyAdminControlSettings } from "@/lib/companyAdminControl";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

function getRequestUserId(req: NextRequest): string | null {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  return (payload as any)?.userId ?? req.headers.get("x-user-id") ?? null;
}

// PATCH /api/admin/shift-settings/overtime
// Body: { userId, overtimeMinutes }   — sets overtimeMinutes directly (0 to reset)
export async function PATCH(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const adminUserId = getRequestUserId(req);
  const body = await req.json();
  const { userId, overtimeMinutes } = body as { userId: string; overtimeMinutes: number };

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (typeof overtimeMinutes !== "number" || overtimeMinutes < 0) {
    return NextResponse.json({ error: "overtimeMinutes must be >= 0" }, { status: 400 });
  }

  const settings = await getCompanyAdminControlSettings(companyId);
  const existing = settings.shiftSettings[userId];
  if (!existing) {
    return NextResponse.json({ error: "No shift setting found for this user" }, { status: 404 });
  }

  const updated = await saveCompanyAdminControlSettings(companyId, adminUserId, {
    shiftSettings: { [userId]: { ...existing, overtimeMinutes } },
  });

  return NextResponse.json({ success: true, overtimeMinutes, shiftSettings: updated.shiftSettings });
}
