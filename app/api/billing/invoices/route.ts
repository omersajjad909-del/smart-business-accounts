import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiOk } from "@/lib/apiError";

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return apiError("Company required", 400);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        plan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        createdAt: true,
      },
    });

    if (!company) return apiError("Company not found", 404);

    // Build invoices from stored subscription data so this route works even
    // when the optional Stripe SDK is not installed in the deployment target.
    if (
      company.subscriptionStatus &&
      company.subscriptionStatus !== "inactive" &&
      company.plan &&
      company.plan !== "FREE"
    ) {
      const planPrices: Record<string, number> = {
        STARTER: 49,
        PROFESSIONAL: 99,
        PRO: 99,
        ENTERPRISE: 249,
        CUSTOM: 0,
      };
      const normalizedPlan = company.plan.toUpperCase();
      const amount = planPrices[normalizedPlan] ?? 0;
      const dateSource = company.currentPeriodEnd ?? company.createdAt;
      const date = new Date(dateSource).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      return apiOk({
        invoices: [
          {
            id: `db_${companyId}`,
            number: `INV-${new Date().getFullYear()}-001`,
            date,
            amount,
            currency: "USD",
            status: company.subscriptionStatus === "ACTIVE" ? "paid" : "open",
            plan: company.plan,
          },
        ],
      });
    }

    return apiOk({ invoices: [] });
  } catch (err) {
    console.error("[billing/invoices] Unexpected error:", err);
    return apiError("Failed to fetch invoices", 500);
  }
}
