/**
 * GET  /api/job-work/challans        — list issue challans (?status=open|partial|closed, ?workerId=)
 * POST /api/job-work/challans        — issue material to a thekedar
 *
 * The issue is not a sale and posts nothing to the worker's account. See the
 * module header in lib/jobWork.ts for why.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchIdOrDefault } from "@/lib/tenant";
import {
  assertJobWorkEnabled,
  issueToJobWorker,
  readChallan,
  JobWorkError,
  JOB_WORK_CATEGORIES,
} from "@/lib/jobWork";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

function fail(e: unknown, fallback: string) {
  if (e instanceof JobWorkError) return NextResponse.json({ error: e.message }, { status: e.status });
  const message = e instanceof Error ? e.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    await assertJobWorkEnabled(companyId);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const workerId = searchParams.get("workerId") || "";

    const rows = await prisma.businessRecord.findMany({
      where: {
        companyId,
        category: JOB_WORK_CATEGORIES.CHALLAN,
        ...(status === "pending" ? { status: { in: ["open", "partial"] } } : status ? { status } : {}),
        ...(workerId ? { refId: workerId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(rows.map(readChallan));
  } catch (e) {
    return fail(e, "Failed to list challans");
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    await assertJobWorkEnabled(companyId);

    const role = String(req.headers.get("x-user-role") || "").trim().toUpperCase();
    if (!WRITE_ROLES.has(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const branchId = await resolveBranchIdOrDefault(req, companyId);
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

    const result = await issueToJobWorker({
      companyId,
      branchId,
      workerId: String(body.workerId || ""),
      lines: Array.isArray(body.lines)
        ? body.lines.map((l: { itemId?: unknown; qty?: unknown; standardPerPc?: unknown }) => ({
            itemId: String(l?.itemId || ""),
            qty: Number(l?.qty),
            standardPerPc: Number(l?.standardPerPc),
          }))
        : [],
      date: body.date,
      sourceLocation: body.sourceLocation,
      finishedItemId: String(body.finishedItemId || ""),
      expectedQty: Number(body.expectedQty),
      ratePerPc: Number(body.ratePerPc),
      allowedWastagePct: Number(body.allowedWastagePct),
      notes: String(body.notes || ""),
      // Passed through as-is; readChallanFormula normalises it on the way back
      // out, so a malformed stamp degrades to "no formula" rather than to bad
      // numbers on a receipt.
      formula: body.formula && typeof body.formula === "object" ? body.formula : null,
      allowNegativeStock: body.allowNegativeStock === true,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return fail(e, "Failed to issue material");
  }
}
