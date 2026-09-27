import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { invoiceParts } from "@/lib/invoiceAmounts";
import { getBaseAmounts, resolveAmount } from "@/lib/currencyHelper";

/**
 * Sales tax owed month by month this year: output tax on sales less input tax
 * on purchases (the same figures as the Tax Summary report), and what has
 * already been paid to the tax authority.
 *
 * This used to count output tax only — so the liability was overstated by the
 * whole input credit — estimated it as total × rate ÷ (100 + rate), and always
 * reported nothing paid.
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

    const now = new Date();
    const year = now.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    const scope = { companyId, deletedAt: null, date: { gte: yearStart, lte: yearEnd } };
    const select = {
      id: true, date: true, total: true, discount: true, discountType: true, freight: true,
      items: { select: { qty: true, rate: true } },
    } as const;

    // The liability accounts output tax is credited to — named the way
    // lib/salesPosting.ts finds them, never an income-tax account.
    const taxAccounts = (
      await prisma.account.findMany({
        where: { companyId, name: { contains: "tax", mode: "insensitive" } },
        select: { id: true, name: true, type: true },
      })
    ).filter((a) => /^LIABILIT/i.test(a.type || "") && !/income|withhold|advance/i.test(a.name) && /sales tax|gst|vat|output|tax payable/i.test(a.name));

    const [sales, purchases, payments] = await Promise.all([
      prisma.salesInvoice.findMany({ where: scope, select }),
      prisma.purchaseInvoice.findMany({ where: scope, select }),
      // Money paid over: debits to the tax account from anything other than
      // the invoices themselves (their tax legs are the liability, not payment).
      taxAccounts.length
        ? prisma.voucherEntry.findMany({
            where: {
              accountId: { in: taxAccounts.map((a) => a.id) },
              amount: { gt: 0 },
              voucher: { companyId, deletedAt: null, date: { gte: yearStart, lte: yearEnd }, type: { notIn: ["SI", "SR", "PI", "PR", "OPENING", "YEAR_END"] } },
            },
            select: { amount: true, voucher: { select: { date: true } } },
          })
        : Promise.resolve([]),
    ]);
    const baseAmounts = await getBaseAmounts([...sales, ...purchases].map((i) => i.id));

    const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthMap = new Map<string, { liability: number; paid: number }>();
    for (let m = 0; m < 12; m++) monthMap.set(`${year}-${String(m + 1).padStart(2, "0")}`, { liability: 0, paid: 0 });

    const taxOf = (inv: (typeof sales)[number]) => {
      const { tax } = invoiceParts(inv);
      const total = Number(inv.total) || 0;
      return total ? (tax * resolveAmount(inv.id, total, baseAmounts)) / total : 0;
    };
    for (const inv of sales) { const r = monthMap.get(key(inv.date)); if (r) r.liability += taxOf(inv); }
    for (const inv of purchases) { const r = monthMap.get(key(inv.date)); if (r) r.liability -= taxOf(inv); }
    for (const p of payments) { const r = monthMap.get(key(p.voucher.date)); if (r) r.paid += Number(p.amount) || 0; }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const months = [...monthMap.entries()].map(([month, r]) => ({
      month,
      liability: round2(r.liability),
      paid: round2(r.paid),
      remaining: round2(r.liability - r.paid),
    }));
    const ytdLiability = round2(months.reduce((s, m) => s + m.liability, 0));
    const ytdPaid = round2(months.reduce((s, m) => s + m.paid, 0));

    // Sales tax return and payment are due on the 15th of the following month.
    const nextDueDate = new Date(year, now.getMonth() + 1, 15);

    return NextResponse.json({
      months,
      summary: [{ taxType: "Sales Tax", ytdLiability, ytdPaid, remaining: round2(ytdLiability - ytdPaid), nextDueDate }],
    });
  } catch (e: any) {
    console.error("TAX FORECAST ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
