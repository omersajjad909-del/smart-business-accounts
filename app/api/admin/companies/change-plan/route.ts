import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { companyId, plan, subscriptionStatus, note } = await req.json();

    if (!companyId || !plan) {
      return NextResponse.json({ error: "companyId and plan are required" }, { status: 400 });
    }

    const VALID_PLANS   = ["STARTER", "PRO", "ENTERPRISE", "CUSTOM"];
    const VALID_STATUSES = ["ACTIVE", "INACTIVE", "TRIALING", "PAST_DUE", "CANCELED"];

    if (!VALID_PLANS.includes(plan.toUpperCase())) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (subscriptionStatus && !VALID_STATUSES.includes(subscriptionStatus.toUpperCase())) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updateData: Record<string, any> = { plan: plan.toUpperCase() };
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus.toUpperCase();

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });

    // Log to AdminActionLog (admin audit trail)
    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "CHANGE_PLAN",
      targetType: "Company",
      targetId: companyId,
      targetLabel: updated.name,
      companyId,
      details: { newPlan: plan.toUpperCase(), newStatus: subscriptionStatus || null, note: note || null },
    });

    // Also log to company activity log
    await prisma.activityLog.create({
      data: {
        companyId,
        action: "ADMIN_PLAN_CHANGE",
        details: JSON.stringify({ newPlan: plan.toUpperCase(), newStatus: subscriptionStatus || null, note: note || null, changedBy: admin.email }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, company: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to change plan" }, { status: 500 });
  }
}
