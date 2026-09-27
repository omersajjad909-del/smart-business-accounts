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
    const customerId = searchParams.get("customerId");
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    if (!customerId) return NextResponse.json({ error: "customerId is required" }, { status: 400 });

    const fromDate = from ? new Date(from + "T00:00:00") : new Date(new Date().getFullYear() + "-01-01T00:00:00");
    const toDate   = to   ? new Date(to + "T23:59:59.999") : new Date();

    const customer = await prisma.account.findFirst({
      where: { id: customerId, companyId, partyType: "CUSTOMER", deletedAt: null },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    // Read from the customer's ledger account — see lib/partyStatement.ts for why
    // invoices + receipts was not enough.
    const st = await computePartyStatement({
      companyId,
      accountId: customerId,
      side: "CUSTOMER",
      from: fromDate,
      to: toDate,
      creditDays: customer.creditDays,
    });

    return NextResponse.json({
      customer: { id: customer.id, name: customer.name, email: customer.email || null, phone: customer.phone || null, city: customer.city || null, creditDays: customer.creditDays || 0, creditLimit: customer.creditLimit || 0 },
      period: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
      openingBalance: st.openingBalance, totalInvoiced: st.totalInvoiced, totalReceived: st.totalSettled,
      closingBalance: st.closingBalance, rows: st.rows, ageing: st.ageing,
    });
  } catch (err) {
    console.error("CUSTOMER STATEMENT ERROR:", err);
    return NextResponse.json({ error: "Failed to generate customer statement" }, { status: 500 });
  }
}
