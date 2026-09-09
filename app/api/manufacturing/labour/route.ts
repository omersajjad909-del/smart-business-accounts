/**
 * GET  /api/manufacturing/labour        — list piece-rate workers
 * POST /api/manufacturing/labour        — add one, and give them a payable
 *                                          ledger account under Labour Payable
 * PATCH  /api/manufacturing/labour      — rename / re-rate one, keeping its
 *                                          code and ledger account
 * DELETE /api/manufacturing/labour?id=  — remove one that has never traded
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

export async function PATCH(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const existing = await prisma.businessRecord.findFirst({
      where: { id, companyId, category: "labour" },
    });
    if (!existing) return NextResponse.json({ error: "Labour not found" }, { status: 404 });

    const d = (existing.data ?? {}) as Record<string, unknown>;
    const ratePer1000 = Number(body?.ratePer1000);
    const ratePerUnit = Number.isFinite(ratePer1000) && ratePer1000 > 0 ? ratePer1000 / 1000 : 0;
    const phone = String(body?.phone || "").trim();
    const code = String(d.code || "");
    const accountId = String(d.accountId || "");

    const record = await prisma.businessRecord.update({
      where: { id: existing.id },
      data: { title: name, data: { ...d, code, name, phone, ratePerUnit, accountId } },
    });

    // The ledger account carries the worker's name, so a rename that stopped at
    // the labour row would leave the chart of accounts pointing at the old one.
    if (accountId) {
      await prisma.account.updateMany({
        where: { id: accountId, companyId },
        data: { name: `${name} — Labour Payable` },
      });
    }

    return NextResponse.json({ id: record.id, name, code, phone, ratePerUnit, accountId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update labour";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await prisma.businessRecord.findFirst({
      where: { id, companyId, category: "labour" },
    });
    if (!existing) return NextResponse.json({ error: "Labour not found" }, { status: 404 });

    const d = (existing.data ?? {}) as Record<string, unknown>;
    const accountId = String(d.accountId || "");

    // A worker who has been paid or charged to a production run owns ledger
    // history; deleting the row would leave posted vouchers pointing at an
    // account nobody can name. Only a worker who never traded can be removed.
    if (accountId) {
      const account = await prisma.account.findFirst({
        where: { id: accountId, companyId },
        select: { openDebit: true, openCredit: true },
      });
      const entries = await prisma.voucherEntry.count({
        where: { accountId, voucher: { companyId } },
      });
      const hasOpening = Number(account?.openDebit || 0) !== 0 || Number(account?.openCredit || 0) !== 0;
      if (entries > 0 || hasOpening) {
        return NextResponse.json(
          {
            error:
              "This worker already has ledger entries, so deleting them would break posted vouchers. Clear or reverse their ledger first.",
          },
          { status: 409 },
        );
      }
    }

    await prisma.businessRecord.deleteMany({ where: { id, companyId, category: "labour" } });
    if (accountId) {
      await prisma.account.deleteMany({ where: { id: accountId, companyId } });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete labour";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
