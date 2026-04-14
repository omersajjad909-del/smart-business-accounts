import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiError, apiOk } from "@/lib/apiError";

// Data Retention Policy:
//   Day  0      — subscription cancelled, account becomes read-only
//   Day  1–30   — read-only grace period, user can still export data
//   Day 31–90   — account locked (login disabled), data preserved
//   Day 90+     — hard delete triggered by /api/admin/cron/data-cleanup

const RETENTION_DAYS = 90;
const GRACE_PERIOD_DAYS = 30; // read-only window

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return apiError("Company required", 400);

    const userRole = req.headers.get("x-user-role");
    if (userRole?.toUpperCase() !== "ADMIN") return apiError("Forbidden", 403);

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason ? String(body.reason).slice(0, 500) : null;

    const now = new Date();
    const dataRetentionUntil = new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const gracePeriodEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    await prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionStatus: "CANCELED",
        cancelledAt: now,
        dataRetentionUntil,
      },
    });

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: req.headers.get("x-user-id") || null,
        action: "SUBSCRIPTION_CANCELED",
        details: JSON.stringify({
          reason,
          canceledAt: now.toISOString(),
          dataRetentionUntil: dataRetentionUntil.toISOString(),
          gracePeriodEnd: gracePeriodEnd.toISOString(),
          policy: `Read-only for ${GRACE_PERIOD_DAYS} days, data retained for ${RETENTION_DAYS} days, then permanently deleted.`,
        }),
      },
    }).catch(() => {});

    return apiOk({
      canceled: true,
      dataRetentionUntil: dataRetentionUntil.toISOString(),
      gracePeriodEnd: gracePeriodEnd.toISOString(),
      retentionDays: RETENTION_DAYS,
      message: `Your data will be retained until ${dataRetentionUntil.toLocaleDateString()}. You have ${GRACE_PERIOD_DAYS} days to export your data in read-only mode.`,
    });
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : "Cancel failed", 500);
  }
}
