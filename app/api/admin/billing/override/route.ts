import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";

/*
  POST /api/admin/billing/override
  Actions:
    - EXTEND_TRIAL      — set currentPeriodEnd to future date, status → TRIALING
    - GRANT_FREE_ACCESS — set plan + status → ACTIVE + currentPeriodEnd
    - RESET_INTRO_OFFER — delete BILLING_OFFER_CLAIM log (lets them use 75% off again)
    - SET_STATUS        — manually override subscriptionStatus only
    - ADD_NOTE          — add an internal audit note
*/

const ALLOWED_ACTIONS = ["EXTEND_TRIAL", "GRANT_FREE_ACCESS", "RESET_INTRO_OFFER", "SET_STATUS", "ADD_NOTE"];

export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const adminId = admin.id;

    const { companyId, action, payload, note } = await req.json();

    if (!companyId || !action) {
      return NextResponse.json({ error: "companyId and action required" }, { status: 400 });
    }
    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    let result: any = {};

    /* ── EXTEND_TRIAL ── */
    if (action === "EXTEND_TRIAL") {
      const { days } = payload || {};
      if (!days || days < 1 || days > 365) {
        return NextResponse.json({ error: "days must be 1–365" }, { status: 400 });
      }
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + Number(days));

      result = await prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionStatus: "TRIALING",
          currentPeriodEnd: newEnd,
        },
      });
    }

    /* ── GRANT_FREE_ACCESS ── */
    if (action === "GRANT_FREE_ACCESS") {
      const { days, plan } = payload || {};
      if (!days || days < 1 || days > 365) {
        return NextResponse.json({ error: "days must be 1–365" }, { status: 400 });
      }
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + Number(days));

      result = await prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionStatus: "ACTIVE",
          plan: (plan || company.plan || "PRO").toUpperCase(),
          currentPeriodEnd: newEnd,
        },
      });
    }

    /* ── RESET_INTRO_OFFER ── */
    if (action === "RESET_INTRO_OFFER") {
      await prisma.activityLog.deleteMany({
        where: { companyId, action: "BILLING_OFFER_CLAIM" },
      });
      result = { reset: true };
    }

    /* ── SET_STATUS ── */
    if (action === "SET_STATUS") {
      const { status } = payload || {};
      const VALID = ["ACTIVE", "INACTIVE", "TRIALING", "PAST_DUE", "CANCELED"];
      if (!status || !VALID.includes(status.toUpperCase())) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      result = await prisma.company.update({
        where: { id: companyId },
        data: { subscriptionStatus: status.toUpperCase() },
      });
    }

    /* ── Always log the override ── */
    await prisma.activityLog.create({
      data: {
        companyId,
        userId: adminId,
        action: "ADMIN_BILLING_OVERRIDE",
        details: JSON.stringify({
          action,
          payload: payload || null,
          note: note || null,
          adminId,
          companyName: company.name,
          previousPlan: company.plan,
          previousStatus: company.subscriptionStatus,
          previousPeriodEnd: company.currentPeriodEnd,
          timestamp: new Date().toISOString(),
        }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Override failed" }, { status: 500 });
  }
}

/* GET — fetch override history for a company */
export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const logs = await prisma.activityLog.findMany({
    where: { companyId, action: "ADMIN_BILLING_OVERRIDE" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ logs });
}
