import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/apiError";
import { getCompanyBillingContext } from "@/lib/billingInvoice";

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return apiError("Company required", 400);

    // Shared with /api/billing/invoices/pdf so a row's id and number resolve to
    // the same invoice in both places.
    const ctx = await getCompanyBillingContext(companyId);
    if (!ctx) return apiError("Company not found", 404);

    // `ledger` holds the raw PlatformInvoice row — internal detail the billing
    // page does not need, so it is not shipped to the browser.
    return apiOk({
      invoices: ctx.invoices.map(({ issuedAt, derived, ledger, ...invoice }) => invoice),
    });
  } catch (err) {
    console.error("[billing/invoices] Unexpected error:", err);
    return apiError("Failed to fetch invoices", 500);
  }
}
