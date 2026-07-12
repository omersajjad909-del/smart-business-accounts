import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";

export const runtime = "nodejs";

type ExportRecord = {
  id:          string;
  invoiceNo:   string;
  date:        string;
  customer:    string;
  country:     string;
  product:     string;
  hsCode:      string;
  currency:    string;
  amount:      number;
  amountUsd:   number;
  qty:         number;
  unit:        string;
  shipmentRef: string;
  status:      string;
};

// Best-effort country extraction: try last comma-separated token in address,
// fall back to `city`, else "Local".
function extractCountry(address?: string | null, city?: string | null): string {
  if (address && address.trim()) {
    const parts = address.split(",").map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 1];
  }
  if (city && city.trim()) return city.trim();
  return "Local";
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!role || (role !== "ADMIN" && role !== "ACCOUNTANT" && role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    const branchId = await resolveBranchId(req, companyId);

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    const fromDate = from ? new Date(from + "T00:00:00") : undefined;
    const toDate   = to   ? new Date(to   + "T23:59:59.999") : undefined;

    const invoices = await prisma.salesInvoice.findMany({
      where: {
        deletedAt: null,
        companyId,
        ...(branchId ? { branchId } : {}),
        date: { gte: fromDate, lte: toDate },
      },
      include: {
        customer: { select: { name: true, city: true, address: true } },
        items: {
          include: { item: { select: { name: true, unit: true, code: true } } },
        },
      },
      orderBy: { date: "asc" },
    });

    const rows: ExportRecord[] = [];
    for (const inv of invoices) {
      const country = extractCountry(inv.customer?.address, inv.customer?.city);
      const totalQty = inv.items.reduce((sum, it) => sum + Number(it.qty), 0);
      for (const it of inv.items) {
        const amount = Number(it.amount);
        rows.push({
          id:          `${inv.id}-${it.id}`,
          invoiceNo:   inv.invoiceNo,
          date:        inv.date.toISOString().slice(0, 10),
          customer:    inv.customer?.name || "",
          country,
          product:     it.item?.name || "",
          hsCode:      it.item?.code || "",
          currency:    "USD",
          amount,
          amountUsd:   amount,
          qty:         Number(it.qty),
          unit:        it.item?.unit || "PCS",
          shipmentRef: inv.reference || "",
          status:      inv.approvalStatus === "APPROVED" ? "SHIPPED" : inv.approvalStatus,
        });
        void totalQty;
      }
    }

    return NextResponse.json({ records: rows });
  } catch (e: unknown) {
    console.error("EXPORT PERFORMANCE ERROR:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
