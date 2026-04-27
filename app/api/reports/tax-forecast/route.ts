import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    // Fetch all sales invoices for the year with tax config
    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: yearStart, lte: yearEnd } },
      include: { taxConfig: { select: { taxType: true, taxRate: true } } },
    });

    // Monthly tax liability
    const monthMap = new Map<string, { liability: number }>();
    for (let m = 0; m < 12; m++) {
      const key = `${now.getFullYear()}-${String(m + 1).padStart(2, "0")}`;
      monthMap.set(key, { liability: 0 });
    }

    let ytdLiability = 0;
    for (const inv of invoices) {
      if (!inv.taxConfig) continue;
      const key = `${inv.date.getFullYear()}-${String(inv.date.getMonth() + 1).padStart(2, "0")}`;
      const taxAmt = (inv.total * inv.taxConfig.taxRate) / (100 + inv.taxConfig.taxRate);
      if (monthMap.has(key)) monthMap.get(key)!.liability += taxAmt;
      ytdLiability += taxAmt;
    }

    const months = [...monthMap.entries()].map(([month, r]) => ({
      month,
      liability: r.liability,
      paid: 0,
      remaining: r.liability,
    }));

    // Current month's due date (usually 15th of next month)
    const nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);

    const summary = [
      {
        taxType: "Sales Tax",
        ytdLiability,
        ytdPaid: 0,
        remaining: ytdLiability,
        nextDueDate,
      },
    ];

    return NextResponse.json({ months, summary });
  } catch (e: any) {
    console.error("TAX FORECAST ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
