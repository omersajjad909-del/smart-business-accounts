import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { getDueThisWeek } from "@/lib/dashboardData";

// Same answer as the dashboard's due-this-week panel (/api/dashboard/secondary);
// the two used to be separate copies of the same query.
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    return NextResponse.json(await getDueThisWeek(companyId));
  } catch (e: any) {
    console.error("DUE THIS WEEK ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
