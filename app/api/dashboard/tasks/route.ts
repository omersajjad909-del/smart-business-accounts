import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
import { openPartyBills } from "@/lib/ledgerKpis";
import { prisma } from "@/lib/prisma";

export type TaskStatus = "overdue" | "today" | "soon" | "upcoming";

// Full list behind the dashboard's "Upcoming Tasks" card. Same bill-wise
// ledger source (openPartyBills) as the card, so the numbers always agree —
// the card just shows the top few of this list.
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const allowed = await apiHasPermission(
      req.headers.get("x-user-id"), req.headers.get("x-user-role"), PERMISSIONS.VIEW_DASHBOARD, companyId,
    );
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const now = new Date();
    const dayMs = 86_400_000;
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const [receivable, payable, company] = await Promise.all([
      openPartyBills(companyId, "RECEIVABLE", now),
      openPartyBills(companyId, "PAYABLE", now),
      prisma.company.findUnique({ where: { id: companyId }, select: { baseCurrency: true } }),
    ]);

    const shape = (side: "COLLECT" | "PAY", bills: typeof receivable) =>
      bills.map((b) => {
        const dueDay = new Date(b.dueDate.getFullYear(), b.dueDate.getMonth(), b.dueDate.getDate()).getTime();
        const diff = Math.round((dueDay - startToday) / dayMs); // <0 overdue, 0 today
        const status: TaskStatus = diff < 0 ? "overdue" : diff === 0 ? "today" : diff <= 7 ? "soon" : "upcoming";
        return {
          id: `${side}:${b.accountId}:${b.ref}:${b.date.toISOString()}`,
          side,
          party: b.party,
          invoiceNo: b.ref === "---" ? "Opening balance" : b.ref,
          billDate: b.date.toISOString().slice(0, 10),
          dueDate: b.dueDate.toISOString().slice(0, 10),
          amount: b.amount,
          balance: b.balance,
          daysOverdue: diff < 0 ? -diff : 0,
          daysLeft: diff >= 0 ? diff : 0,
          status,
        };
      });

    const tasks = [...shape("COLLECT", receivable), ...shape("PAY", payable)].sort(
      (a, b) => a.dueDate.localeCompare(b.dueDate) || b.balance - a.balance,
    );

    return NextResponse.json(
      { currency: company?.baseCurrency || "PKR", tasks },
      { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=45" } },
    );
  } catch (e: any) {
    console.error("DASHBOARD TASKS API ERROR:", e);
    return NextResponse.json({ error: e.message || "Failed to load tasks" }, { status: 500 });
  }
}
