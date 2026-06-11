import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPkPaymentStatusEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET() {
  try {
    const requests = await (prisma as any).pkPaymentRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ requests });
  } catch (err) {
    console.error("[admin/pk-payments] GET error:", err);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
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

      await prisma.company.update({
        where: { id: updated.companyId },
        data: {
          plan: updated.plan,
          subscriptionStatus: "ACTIVE",
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
        },
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
