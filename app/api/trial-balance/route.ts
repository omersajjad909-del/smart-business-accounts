import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { computeTrialBalance } from "@/lib/trialBalance";

/**
 * GET /api/trial-balance — the flat, whole-history view.
 *
 * The report screen reads /api/reports/trial-balance, which returns opening,
 * movement and closing per account for a date range. This one answers the older
 * and simpler question — total debit and credit per account, all time — and is
 * kept because it is a public route shape.
 *
 * It used to count `CRV` and `CPV` vouchers only, so sales, purchases, journals,
 * cost of sales and every manufacturing entry were missing: a factory that had
 * produced and sold all month got a page of zeros. Both routes now share
 * lib/trialBalance.ts, which counts every voucher.
 */
export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Both queries used to run unscoped, so this report returned every account
  // and voucher in the database — one tenant's trial balance listed other
  // companies' parties by name. Everything here is now bound to the caller's
  // company.
  const companyId = await resolveCompanyId(req);
  if (!companyId || companyId === "system") {
    return NextResponse.json({ error: "Company context required" }, { status: 400 });
  }

  const branchId = await resolveBranchId(req, companyId);
  const { rows } = await computeTrialBalance({ companyId, branchId });

  // Whole history, so there is no opening period: movement is the balance.
  return NextResponse.json(
    rows.map((r) => ({ name: r.name, debit: r.transDebit, credit: r.transCredit })),
  );
}
