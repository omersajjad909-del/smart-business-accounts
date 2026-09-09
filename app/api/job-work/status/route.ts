/**
 * GET /api/job-work/status — is job work available in this workspace?
 *
 * The screen asks before it renders anything, so a real company gets a clear
 * "internal test only" panel instead of a form that would fail on submit.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { isJobWorkEnabled, JOB_WORK_CATEGORIES } from "@/lib/jobWork";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const enabled = await isJobWorkEnabled(companyId);
    if (!enabled) {
      return NextResponse.json({
        enabled: false,
        reason:
          "Job Work is still under test and runs only in an internal test workspace. " +
          "Create one from Admin → Dev Test.",
        summary: { workers: 0, openChallans: 0, closedChallans: 0, receipts: 0 },
      });
    }

    const [workers, openChallans, closedChallans, receipts] = await Promise.all([
      prisma.businessRecord.count({ where: { companyId, category: JOB_WORK_CATEGORIES.WORKER } }),
      prisma.businessRecord.count({
        where: { companyId, category: JOB_WORK_CATEGORIES.CHALLAN, status: { in: ["open", "partial"] } },
      }),
      prisma.businessRecord.count({
        where: { companyId, category: JOB_WORK_CATEGORIES.CHALLAN, status: "closed" },
      }),
      prisma.businessRecord.count({ where: { companyId, category: JOB_WORK_CATEGORIES.RECEIPT } }),
    ]);

    return NextResponse.json({
      enabled: true,
      reason: "",
      summary: { workers, openChallans, closedChallans, receipts },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to read job work status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
