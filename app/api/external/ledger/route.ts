/**
 * GET /api/external/ledger?accountId=<id>   — ledger entries for one account
 * GET /api/external/ledger?accounts=1        — list all chart-of-accounts
 *
 * Auth: x-api-key or Authorization: Bearer <key>
 *
 * Query params (when accountId given):
 *   from    YYYY-MM-DD
 *   to      YYYY-MM-DD
 *   limit   default 100, max 500
 *   offset
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiSession, unauthResponse, enforceApiPlan } from "../_auth";

type VoucherFilter = {
  companyId: string;
  date?: { gte?: Date; lte?: Date };
};

export async function GET(req: NextRequest) {
  const session = await resolveApiSession(req);
  if (!session) return unauthResponse();

  const blocked = enforceApiPlan(session, "GET");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const accountId  = searchParams.get("accountId");
  const listAccts  = searchParams.get("accounts");

  // ── List all accounts (chart of accounts) ──────────────────────────
  if (listAccts) {
    const accounts = await prisma.account.findMany({
      where: { companyId: session.companyId, deletedAt: null },
      select: { id: true, code: true, name: true, partyType: true, type: true, openDebit: true, openCredit: true },
      orderBy: { code: "asc" },
    });
    return NextResponse.json({
      accounts: accounts.map((account) => ({
        ...account,
        category: account.partyType ?? account.type,
        openingBalance: Number(account.openDebit || 0) - Number(account.openCredit || 0),
      })),
    });
  }

  if (!accountId) {
    return NextResponse.json(
      { error: "Provide ?accountId=<id> for ledger entries, or ?accounts=1 for chart of accounts" },
      { status: 400 }
    );
  }

  // Verify account belongs to this company
  const account = await prisma.account.findFirst({
    where: { id: accountId, companyId: session.companyId, deletedAt: null },
    select: { id: true, name: true, code: true, partyType: true, type: true, openDebit: true, openCredit: true },
  }).catch(() => null);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const from   = searchParams.get("from");
  const to     = searchParams.get("to");
  const limit  = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
  const offset = parseInt(searchParams.get("offset") || "0");

  const voucherWhere: VoucherFilter = { companyId: session.companyId };
  if (from || to) {
    voucherWhere.date = {};
    if (from) voucherWhere.date.gte = new Date(from);
    if (to)   voucherWhere.date.lte = new Date(to);
  }

  const entries = await prisma.voucherEntry.findMany({
    where: {
      accountId,
      voucher: voucherWhere,
    },
    include: { voucher: { select: { date: true, voucherNo: true, narration: true, type: true } } },
    orderBy: { voucher: { date: "asc" } },
    take: limit,
    skip: offset,
  });

  const openingBalance = Number(account.openDebit || 0) - Number(account.openCredit || 0);
  let balance = openingBalance;
  const rows = entries.map((e) => {
    const amount = Number(e.amount);
    const debit  = amount > 0 ? amount : 0;
    const credit = amount < 0 ? Math.abs(amount) : 0;
    balance += debit - credit;
    return {
      date:      e.voucher.date,
      voucherNo: e.voucher.voucherNo,
      type:      e.voucher.type,
      narration: e.voucher.narration ?? "",
      debit,
      credit,
      balance: Math.round(balance * 100) / 100,
    };
  });

  return NextResponse.json({
    account: {
      id: account.id,
      name: account.name,
      code: account.code,
      category: account.partyType ?? account.type,
      type: account.type,
    },
    openingBalance,
    closingBalance: balance,
    entries: rows,
    count: rows.length,
    limit,
    offset,
  });
}
