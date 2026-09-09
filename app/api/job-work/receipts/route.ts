/**
 * GET  /api/job-work/receipts?challanId=&goodQty=  — price a receipt, write nothing
 * GET  /api/job-work/receipts?challanId=&list=1    — receipts already posted against a challan
 * POST /api/job-work/receipts                      — take the pieces back and post
 *
 * The GET pricing path exists so the operator sees the per-piece cost and any
 * wastage recovery *before* committing — the two numbers that decide whether
 * the order made money at all.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchIdOrDefault } from "@/lib/tenant";
import {
  assertJobWorkEnabled,
  priceJobWorkReceipt,
  readChallan,
  receiveFromJobWorker,
  JobWorkError,
  JOB_WORK_CATEGORIES,
} from "@/lib/jobWork";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

function fail(e: unknown, fallback: string) {
  if (e instanceof JobWorkError) return NextResponse.json({ error: e.message }, { status: e.status });
  const message = e instanceof Error ? e.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

function parseLines(raw: string | null): { itemId: string; qty: number }[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    return parsed
      .map((l: { itemId?: unknown; qty?: unknown }) => ({ itemId: String(l?.itemId || ""), qty: Number(l?.qty) }))
      .filter((l) => l.itemId && Number.isFinite(l.qty) && l.qty > 0);
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    await assertJobWorkEnabled(companyId);

    const { searchParams } = new URL(req.url);
    const challanId = searchParams.get("challanId") || "";
    if (!challanId) return NextResponse.json({ error: "challanId required" }, { status: 400 });

    if (searchParams.get("list")) {
      const rows = await prisma.businessRecord.findMany({
        where: { companyId, category: JOB_WORK_CATEGORIES.RECEIPT, refId: challanId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(
        rows.map((r) => ({
          id: r.id,
          receiptNo: r.title,
          date: r.date ? r.date.toISOString().slice(0, 10) : "",
          totalCost: Number(r.amount || 0),
          ...((r.data ?? {}) as Record<string, unknown>),
        })),
      );
    }

    const record = await prisma.businessRecord.findFirst({
      where: { id: challanId, companyId, category: JOB_WORK_CATEGORIES.CHALLAN },
    });
    if (!record) return NextResponse.json({ error: "Challan not found" }, { status: 404 });

    const challan = readChallan(record);
    const priced = priceJobWorkReceipt({
      challan,
      goodQty: Number(searchParams.get("goodQty") || 0),
      consumed: parseLines(searchParams.get("consumed")),
      returned: parseLines(searchParams.get("returned")),
      jobCharges: searchParams.get("jobCharges") != null ? Number(searchParams.get("jobCharges")) : undefined,
      freight: Number(searchParams.get("freight") || 0),
    });

    return NextResponse.json({ challan, ...priced });
  } catch (e) {
    return fail(e, "Failed to price receipt");
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

    const mapLines = (raw: unknown) =>
      Array.isArray(raw)
        ? raw
            .map((l: { itemId?: unknown; qty?: unknown }) => ({
              itemId: String(l?.itemId || ""),
              qty: Number(l?.qty),
            }))
            .filter((l) => l.itemId && Number.isFinite(l.qty) && l.qty > 0)
        : undefined;

    const result = await receiveFromJobWorker({
      companyId,
      branchId,
      challanId: String(body.challanId || ""),
      goodQty: Number(body.goodQty),
      consumed: mapLines(body.consumed),
      returned: mapLines(body.returned),
      jobCharges: body.jobCharges != null ? Number(body.jobCharges) : undefined,
      freight: Number(body.freight) || 0,
      date: body.date,
      notes: String(body.notes || ""),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return fail(e, "Failed to post receipt");
  }
}
