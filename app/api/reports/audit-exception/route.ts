import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const status = req.nextUrl.searchParams.get("status") || "all";

    const logs = await prisma.auditLog.findMany({
      where: {
        companyId,
        action: { in: ["DELETE", "UPDATE"] },
        ...(status === "unresolved" ? { resolvedAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const rows = logs.map((log) => {
      // Determine severity based on action and entity
      let severity: "LOW" | "MEDIUM" | "HIGH" = "LOW";
      if (log.action === "DELETE") severity = "HIGH";
      else if (["SalesInvoice", "PurchaseInvoice", "Voucher", "Account"].includes(log.entity)) severity = "MEDIUM";

      // Try to extract amount from afterValues or beforeValues
      let amount = 0;
      try {
        const vals = JSON.parse(log.afterValues || log.beforeValues || "{}");
        amount = vals.total || vals.amount || vals.totalAmount || 0;
      } catch {}

      return {
        id: log.id,
        type: log.action,
        description: log.description || `${log.action} on ${log.entity}`,
        referenceNo: log.entityId,
        amount,
        date: log.createdAt,
        severity,
        resolvedAt: (log as any).resolvedAt || null,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("AUDIT EXCEPTION ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
