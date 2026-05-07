import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { getCompanyAdminControlSettings, saveCompanyAdminControlSettings, ShiftSetting } from "@/lib/companyAdminControl";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

function getRequestUserId(req: NextRequest): string | null {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  return (payload as any)?.userId ?? req.headers.get("x-user-id") ?? null;
}

// GET /api/admin/shift-settings
// Returns shift settings for all users in the company + basic user list
export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const [settings, members] = await Promise.all([
    getCompanyAdminControlSettings(companyId),
    prisma.userCompany.findMany({
      where: { companyId },
      include: { user: { select: { id: true, name: true, email: true, role: true, active: true } } },
    }),
  ]);

  const users = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.user.role,
    active: m.user.active,
    shift: settings.shiftSettings[m.user.id] ?? null,
  }));

  return NextResponse.json({ users, shiftSettings: settings.shiftSettings });
}

// POST /api/admin/shift-settings
// Body: { userId, shift: ShiftSetting }
// Saves/updates shift setting for one user
export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const adminUserId = getRequestUserId(req);
  const body = await req.json();
  const { userId, shift } = body as { userId: string; shift: ShiftSetting };

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!shift) return NextResponse.json({ error: "shift required" }, { status: 400 });

  const updated = await saveCompanyAdminControlSettings(companyId, adminUserId, {
    shiftSettings: { [userId]: shift },
  });

  return NextResponse.json({ success: true, shiftSettings: updated.shiftSettings });
}
