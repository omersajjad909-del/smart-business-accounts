import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPkPaymentStatusEmail } from "@/lib/email";
import { recordPlatformInvoice } from "@/lib/platformInvoice";
import { getCompanyNoMap } from "@/lib/companyRefServer";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const requests = await (prisma as any).pkPaymentRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    // The row stores the company UUID, but the admin UI only ever shows
    // companyNo — see lib/companyRef.ts.
    const companyNos = await getCompanyNoMap(requests.map((r: any) => r.companyId));
    return NextResponse.json({
      requests: requests.map((r: any) => ({
        ...r,
        companyNo: r.companyId ? companyNos.get(r.companyId) ?? null : null,
      })),
    });
  } catch (err) {
    console.error("[admin/pk-payments] GET error:", err);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const { id, status, adminNote } = await req.json();

    if (!id || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const updated = await (prisma as any).pkPaymentRequest.update({
      where: { id },
      data: { status, adminNote: adminNote || null, updatedAt: new Date() },
    });

    // If approved → activate subscription for the company
    if (status === "APPROVED" && updated.companyId) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + (updated.billingCycle === "yearly" ? 12 : 1));

      const company = await prisma.company.update({
        where: { id: updated.companyId },
        data: {
          plan: updated.plan,
          subscriptionStatus: "ACTIVE",
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
        },
        select: { name: true },
      });

      // A manually approved JazzCash/Easypaisa transfer is revenue like any
      // other — it belongs in the same ledger, or the admin invoice list and
      // the tax totals silently omit every Pakistani bank payment.
      await recordPlatformInvoice({
        companyId: updated.companyId,
        companyName: company.name,
        provider: "MANUAL",
        providerEventId: `pkreq:${updated.id}`,
        providerOrderId: updated.txId || null,
        plan: updated.plan,
        billingCycle: updated.billingCycle,
        currency: "PKR",
        total: Number(updated.amountPkr) || 0,
        customerEmail: updated.email || null,
        customerCountry: "PK",
        periodEnd,
        issuedAt: now,
      });
    }

    sendPkPaymentStatusEmail({
      customerEmail: updated.email,
      status,
      plan: updated.plan,
      billingCycle: updated.billingCycle,
      method: updated.method,
      adminNote: adminNote || null,
    }).catch(() => {});

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error("[admin/pk-payments] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
