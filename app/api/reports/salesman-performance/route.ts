import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";

// SalesInvoice has no salesmanId field yet.
// When salesmanId is added to the schema, implement groupBy here.
export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  return NextResponse.json({ rows: [] });
}
