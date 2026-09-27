import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { BILL_EPS, asOnWindow, billDays, collectPartyBills, settleBills } from "@/lib/billAgeing";

/**
 * What is owed to each supplier, by how long each bill has been open.
 *
 * Read from the supplier ledger accounts with the same bill-wise settlement the
 * detailed Ageing report uses (lib/billAgeing.ts). This summary used to age the
 * full amount of every purchase invoice, took "payments" from expense vouchers
 * (supplier payments are CPV/bank vouchers) and ignored opening balances — so
 * paid bills stayed in the buckets and the totals never came down.
 */
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const allowed = await apiHasPermission(
      req.headers.get("x-user-id"),
      req.headers.get("x-user-role"),
      PERMISSIONS.VIEW_FINANCIAL_REPORTS,
      companyId,
    );
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const asOnKey = req.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const { before, lastDay } = asOnWindow(asOnKey);

    const suppliers = await prisma.account.findMany({
      where: { companyId, partyType: "SUPPLIER" },
      select: { id: true, name: true, openDebit: true, openCredit: true, openDate: true },
    });
    if (!suppliers.length) return NextResponse.json({ rows: [] });

    const entries = await prisma.voucherEntry.findMany({
      where: {
        accountId: { in: suppliers.map((s) => s.id) },
        voucher: { companyId, deletedAt: null, date: { lt: before } },
      },
      select: { accountId: true, amount: true, voucher: { select: { date: true, voucherNo: true, narration: true, type: true } } },
      orderBy: { voucher: { date: "asc" } },
    });
    const bySupplier = new Map<string, typeof entries>();
    for (const e of entries) {
      const list = bySupplier.get(e.accountId);
      if (list) list.push(e);
      else bySupplier.set(e.accountId, [e]);
    }

    const rows = suppliers
      .map((s) => {
        const { bills, credit } = collectPartyBills({
          entries: bySupplier.get(s.id) ?? [],
          // A credit opening on a supplier is money owed.
          opening: Number(s.openCredit || 0) - Number(s.openDebit || 0),
          openingDate: s.openDate ? new Date(s.openDate) : null,
          asOn: lastDay,
          side: "PAYABLE",
        });
        const { settled, unapplied } = settleBills(bills, credit);

        const r = { supplierName: s.name, current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
        for (const bill of settled) {
          if (bill.balance <= BILL_EPS) continue;
          const days = billDays(bill.date, lastDay);
          if (days <= 30) r.current += bill.balance;
          else if (days <= 60) r.days30 += bill.balance;
          else if (days <= 90) r.days60 += bill.balance;
          else if (days <= 120) r.days90 += bill.balance;
          else r.over90 += bill.balance;
        }
        // An advance paid beyond every bill leaves nothing payable.
        r.total = r.current + r.days30 + r.days60 + r.days90 + r.over90 - unapplied;
        return r;
      })
      .filter((r) => r.total > BILL_EPS)
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("SUPPLIER AGEING ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
