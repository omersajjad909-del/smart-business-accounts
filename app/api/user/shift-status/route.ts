import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { getCompanyAdminControlSettings } from "@/lib/companyAdminControl";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { getPakistanNow, getShiftStatus } from "@/lib/shiftUtils";

function getRequestUserId(req: NextRequest): string | null {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  return (payload as any)?.userId ?? req.headers.get("x-user-id") ?? null;
}

// GET /api/user/shift-status
// Returns the current shift status for the logged-in user.
// The dashboard polls this every 60s to drive the shift-end warning + auto-logout.
export async function GET(req: NextRequest) {
  const userId = getRequestUserId(req);
  if (!userId) return NextResponse.json({ enabled: false }, { status: 200 });

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ enabled: false }, { status: 200 });

  try {
    const settings = await getCompanyAdminControlSettings(companyId);
    const shift = settings.shiftSettings?.[userId];

    if (!shift?.enabled) {
      return NextResponse.json({ enabled: false });
    }

    const pkNow = getPakistanNow();
    const { inShift, minutesRemaining, effectiveEndTime } = getShiftStatus(shift, pkNow);

    return NextResponse.json({
      enabled: true,
      isInShift: inShift,
      minutesRemaining,
      warnMinutes: shift.warnMinutes ?? 10,
      startTime: shift.startTime,
      endTime: shift.endTime,
      effectiveEndTime,
      overtimeMinutes: shift.overtimeMinutes ?? 0,
      days: shift.days,
    });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
