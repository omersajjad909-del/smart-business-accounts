import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { computePartyStatement } from "@/lib/partyStatement";

export async function GET(req: NextRequest) {
  try {
    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company context required" }, { status: 400 });

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_FINANCIAL_REPORTS, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    if (!supplierId) return NextResponse.json({ error: "supplierId is required" }, { status: 400 });

    const fromDate = from ? new Date(from + "T00:00:00") : new Date(new Date().getFullYear() + "-01-01T00:00:00");
    const toDate   = to   ? new Date(to + "T23:59:59.999") : new Date();

    const supplier = await prisma.account.findFirst({
      where: { id: supplierId, companyId, partyType: "SUPPLIER", deletedAt: null },
    });
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    // Read from the supplier's ledger account — see lib/partyStatement.ts for why
    // invoices + receipts was not enough.
    const st = await computePartyStatement({
      companyId,
      accountId: supplierId,
      side: "SUPPLIER",
      from: fromDate,
      to: toDate,
      creditDays: supplier.creditDays,
    });

    return NextResponse.json({
      supplier: { id: supplier.id, name: supplier.name, email: supplier.email || null, phone: supplier.phone || null, city: supplier.city || null, creditDays: supplier.creditDays || 0, creditLimit: supplier.creditLimit || 0 },
      period: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
      openingBalance: st.openingBalance, totalInvoiced: st.totalInvoiced, totalPaid: st.totalSettled,
      closingBalance: st.closingBalance, rows: st.rows, ageing: st.ageing,
    });
  } catch (err) {
    console.error("SUPPLIER STATEMENT ERROR:", err);
    return NextResponse.json({ error: "Failed to generate supplier statement" }, { status: 500 });
  }
}
