import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { clearCompanyData } from "@/lib/clearCompanyData";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;

  const userId = payload?.userId || payload?.id;
  if (!userId || payload?.role !== "ADMIN" || !payload.isTestMode) {
    return NextResponse.json({ error: "Only callable in test mode" }, { status: 403 });
  }

  const companyId = payload.companyId as string;

  try {
    // The forty-step delete lives in lib/clearCompanyData.ts — the demo
    // needs the same wipe, and two copies would drift the moment the schema
    // grows a table.
    await clearCompanyData(companyId, { keepActivityLogAction: "ADMIN_DEV_TEST_COMPANY" });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[dev-test/clear]", err);
    return NextResponse.json({ error: err.message || "Clear failed" }, { status: 500 });
  }
}
