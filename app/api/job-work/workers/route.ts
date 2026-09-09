/**
 * GET    /api/job-work/workers      — list thekedars
 * POST   /api/job-work/workers      — add one, with its own payable ledger account
 * PATCH  /api/job-work/workers      — edit one, keeping its code and account
 * DELETE /api/job-work/workers?id=  — remove one that has never been issued material
 *
 * A dedicated route rather than generic BusinessRecord CRUD because creation
 * has a side effect: the thekedar needs a payable account before the record is
 * written, so a receipt can never find him without one and fall back to an
 * expense head — which is the exact mistake this module exists to prevent.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { ensureAccount } from "@/lib/manufacturingPosting";
import {
  assertJobWorkEnabled,
  jobWorkerCode,
  jobWorkerLocation,
  JobWorkError,
  JOB_WORK_ACCOUNTS,
  JOB_WORK_CATEGORIES,
} from "@/lib/jobWork";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

function role(req: NextRequest) {
  return String(req.headers.get("x-user-role") || "").trim().toUpperCase();
}

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

    const rows = await prisma.businessRecord.findMany({
      where: { companyId, category: JOB_WORK_CATEGORIES.WORKER },
      orderBy: { title: "asc" },
    });

    return NextResponse.json(
      rows.map((r) => {
        const d = (r.data ?? {}) as Record<string, unknown>;
        const code = jobWorkerCode(String(d.code || r.title));
        return {
          id: r.id,
          name: r.title,
          code,
          jobLocation: jobWorkerLocation(code),
          phone: String(d.phone || ""),
          accountId: String(d.accountId || ""),
          defaultRatePerPc: Number(d.defaultRatePerPc) || 0,
          allowedWastagePct: Number(d.allowedWastagePct) || 0,
          status: r.status,
        };
      }),
    );
  } catch (e) {
    return fail(e, "Failed to list job workers");
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    await assertJobWorkEnabled(companyId);
    if (!WRITE_ROLES.has(role(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Thekedar ka naam chahiye" }, { status: 400 });

    const code = jobWorkerCode(String(body.code || name));
    // Codes drive the stock location, so two workers sharing one would pool
    // their material into a single balance that belongs to neither.
    const existing = await prisma.businessRecord.findMany({
      where: { companyId, category: JOB_WORK_CATEGORIES.WORKER },
      select: { data: true, title: true },
    });
    const taken = existing.some(
      (r) => jobWorkerCode(String(((r.data ?? {}) as Record<string, unknown>).code || r.title)) === code,
    );
    if (taken) {
      return NextResponse.json(
        { error: `Code "${code}" pehle se kisi thekedar ka hai — doosra code dein` },
        { status: 400 },
      );
    }

    // The parent head is created once; each worker then gets a sub-account of
    // his own so his balance can be aged and paid off individually.
    await ensureAccount(prisma, companyId, JOB_WORK_ACCOUNTS.PAYABLE_PARENT);
    const accountId = await ensureAccount(prisma, companyId, {
      code: `JW-${code}`,
      name: `Job Work Payable — ${name}`,
      type: JOB_WORK_ACCOUNTS.PAYABLE_PARENT.type,
    });

    const record = await prisma.businessRecord.create({
      data: {
        companyId,
        category: JOB_WORK_CATEGORIES.WORKER,
        title: name,
        status: "active",
        data: {
          code,
          phone: String(body.phone || "").slice(0, 40),
          accountId,
          defaultRatePerPc: Number(body.defaultRatePerPc) > 0 ? Number(body.defaultRatePerPc) : 0,
          allowedWastagePct:
            Number(body.allowedWastagePct) > 0 ? Number(body.allowedWastagePct) : 0,
        },
      },
    });

    return NextResponse.json({
      id: record.id,
      name,
      code,
      jobLocation: jobWorkerLocation(code),
      accountId,
    });
  } catch (e) {
    return fail(e, "Failed to create job worker");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    await assertJobWorkEnabled(companyId);
    if (!WRITE_ROLES.has(role(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const id = String(body?.id || "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const record = await prisma.businessRecord.findFirst({
      where: { id, companyId, category: JOB_WORK_CATEGORIES.WORKER },
    });
    if (!record) return NextResponse.json({ error: "Thekedar nahi mila" }, { status: 404 });

    const d = (record.data ?? {}) as Record<string, unknown>;
    // The code is deliberately not editable: it is baked into every
    // InventoryTxn.location already written, and changing it would strand that
    // material at a location nothing points to any more.
    const updated = await prisma.businessRecord.update({
      where: { id },
      data: {
        title: String(body.name || record.title).trim() || record.title,
        status: String(body.status || record.status),
        data: {
          ...d,
          phone: body.phone != null ? String(body.phone).slice(0, 40) : d.phone,
          defaultRatePerPc:
            body.defaultRatePerPc != null ? Number(body.defaultRatePerPc) || 0 : d.defaultRatePerPc,
          allowedWastagePct:
            body.allowedWastagePct != null ? Number(body.allowedWastagePct) || 0 : d.allowedWastagePct,
        },
      },
    });

    return NextResponse.json({ id: updated.id, name: updated.title });
  } catch (e) {
    return fail(e, "Failed to update job worker");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    await assertJobWorkEnabled(companyId);
    if (!WRITE_ROLES.has(role(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const id = new URL(req.url).searchParams.get("id") || "";
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // A worker who has held material has ledger and stock history behind him.
    // Deleting the row would leave that history pointing at nothing.
    const used = await prisma.businessRecord.count({
      where: { companyId, category: JOB_WORK_CATEGORIES.CHALLAN, refId: id },
    });
    if (used > 0) {
      return NextResponse.json(
        { error: "Is thekedar ke challans maujood hain — delete nahi ho sakta. Status inactive kar dein." },
        { status: 400 },
      );
    }

    await prisma.businessRecord.deleteMany({
      where: { id, companyId, category: JOB_WORK_CATEGORIES.WORKER },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return fail(e, "Failed to delete job worker");
  }
}
