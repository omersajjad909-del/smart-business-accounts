import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({ isTestMode: false });
  }
  return NextResponse.json({
    isTestMode: payload.isTestMode === true,
    testBusinessType: payload.testBusinessType || null,
    testPlan: payload.testPlan || null,
    originCompanyId: payload.originCompanyId || null,
    testCompanyId: payload.isTestMode ? payload.companyId : null,
  });
}
