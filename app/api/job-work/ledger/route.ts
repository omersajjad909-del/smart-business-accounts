/**
 * GET /api/job-work/ledger?workerId= — job worker stock ledger
 *
 * "Thekedar ke paas mera kitna maal para hai?" — the report this module exists
 * to be able to answer. The total is a current asset on the balance sheet and
 * should agree with the Stock at Job Worker account.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { assertJobWorkEnabled, readJobWorkerLedger, JobWorkError } from "@/lib/jobWork";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    await assertJobWorkEnabled(companyId);

    const workerId = new URL(req.url).searchParams.get("workerId") || undefined;
    const rows = await readJobWorkerLedger(companyId, workerId);

    return NextResponse.json({
      workers: rows,
      totalValue: Math.round(rows.reduce((s, r) => s + r.balanceValue, 0) * 100) / 100,
    });
  } catch (e) {
    if (e instanceof JobWorkError) return NextResponse.json({ error: e.message }, { status: e.status });
    const message = e instanceof Error ? e.message : "Failed to read job worker ledger";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
