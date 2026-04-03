import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiError, apiOk } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return apiError("Company required", 400);

    const userRole = req.headers.get("x-user-role");
    if (userRole?.toUpperCase() !== "ADMIN") return apiError("Forbidden", 403);

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason ? String(body.reason).slice(0, 500) : null;

    await prisma.company.update({
      where: { id: companyId },
      data: { subscriptionStatus: "CANCELED" },
    });

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: req.headers.get("x-user-id") || null,
        action: "SUBSCRIPTION_CANCELED",
        details: JSON.stringify({ reason, canceledAt: new Date().toISOString() }),
      },
    }).catch(() => {});

    return apiOk({ canceled: true });
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : "Cancel failed", 500);
  }
}
