/**
 * GET  /api/manufacturing/labour        — list piece-rate workers
 * POST /api/manufacturing/labour        — add one, and give them a payable
 *                                          ledger account under Labour Payable
 *
 * A dedicated route rather than the generic BusinessRecord CRUD hook because
 * creation has a side effect: ensureAccount() must run before the record is
 * written, so the labour row is never without an accountId to post against.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { ensureAccount, LABOUR_ACCOUNTS } from "@/lib/manufacturingPosting";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const rows = await prisma.businessRecord.findMany({
      where: { companyId, category: "labour" },
      orderBy: { title: "asc" },
    });

    return NextResponse.json(
      rows.map((r) => {
        const d = (r.data ?? {}) as Record<string, unknown>;
        return {
          id: r.id,
          name: r.title,
          code: String(d.code || ""),
          phone: String(d.phone || ""),
          ratePerUnit: Number(d.ratePerUnit) || 0,
          accountId: String(d.accountId || ""),
        };
      }),
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load labour";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    // Rate per 1,000 pcs is how the shop floor thinks and talks about it;
    // stored per-unit so a run's cost is a plain qty × rate multiplication.
    const ratePer1000 = Number(body?.ratePer1000);
    const ratePerUnit = Number.isFinite(ratePer1000) && ratePer1000 > 0 ? ratePer1000 / 1000 : 0;
    const phone = String(body?.phone || "").trim();

    const count = await prisma.businessRecord.count({ where: { companyId, category: "labour" } });
    const code = `L-${String(count + 1).padStart(4, "0")}`;

    const parent = await ensureAccount(prisma, companyId, LABOUR_ACCOUNTS.PAYABLE_PARENT);
    const accountId = await ensureAccount(prisma, companyId, {
      code: `LABP-${code}`,
      name: `${name} — Labour Payable`,
      type: "Liability",
    });
    // Keep the sub-account visibly under the parent for anyone reading the
    // chart of accounts, not just findable by name.
    await prisma.account.updateMany({
      where: { id: accountId, companyId, parentId: null },
      data: { parentId: parent },
    });

    const record = await prisma.businessRecord.create({
      data: {
        companyId,
        category: "labour",
        title: name,
        status: "active",
        data: { code, name, phone, ratePerUnit, accountId },
      },
    });

    return NextResponse.json({
      id: record.id,
      name,
      code,
      phone,
      ratePerUnit,
      accountId,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to add labour";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
