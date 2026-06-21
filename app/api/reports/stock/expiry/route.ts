import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const daysAhead = Math.max(1, Number(searchParams.get("days") || "90"));
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + daysAhead);

    // Read stock_receipt records that have expiryDate set
    const receipts = await prisma.businessRecord.findMany({
      where: { companyId, category: "stock_receipt" },
      select: { data: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Aggregate batches per item
    type BatchRow = {
      itemName: string;
      batchNo: string;
      expiryDate: string;
      qty: number;
      value: number;
      daysToExpiry: number;
      status: "expired" | "critical" | "warning" | "ok";
    };

    const rows: BatchRow[] = [];

    for (const rec of receipts) {
      const d = rec.data as any;
      if (!d?.expiryDate || !d?.itemNewId) continue;

      const expiry = new Date(d.expiryDate);
      if (isNaN(expiry.getTime())) continue;

      const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);

      // Only include expiring within window or already expired
      if (daysToExpiry > daysAhead) continue;

      const status: BatchRow["status"] =
        daysToExpiry < 0 ? "expired" :
        daysToExpiry <= 7 ? "critical" :
        daysToExpiry <= 30 ? "warning" : "ok";

      const qty = Number(d.qtyReceived) || 0;
      const value = Math.round(qty * (Number(d.costPrice) || 0));

      rows.push({
        itemName:   d.productName || "Unknown",
        batchNo:    d.batchNo || "—",
        expiryDate: d.expiryDate,
        qty,
        value,
        daysToExpiry,
        status,
      });
    }

    // Sort: expired first, then by days until expiry ascending
    rows.sort((a, b) => a.daysToExpiry - b.daysToExpiry);

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("EXPIRY REPORT ERROR:", e);
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
