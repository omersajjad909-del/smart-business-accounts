import { NextRequest, NextResponse } from "next/server";
import { getStudentUsage } from "@/lib/schoolLimits";
import { isResponse, schoolGuard } from "@/lib/schoolApi";

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false, "SCHOOL_VIEW");
  if (isResponse(ctx)) return ctx;
  return NextResponse.json(await getStudentUsage(ctx.companyId));
}
