// Read/write the company's rate-formula setup.
//
// Kept apart from /api/company/admin-control on purpose. Every document page
// (purchase invoice, GRN, sales invoice…) has to read this on load to know
// whether to draw formula columns, and pulling the whole admin-control blob —
// bank details, branch geo, shift rosters — onto an invoice screen for one
// boolean would be wasteful and would leak settings the operator has no reason
// to hold. GET returns only the rate formula.

import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import {
  getCompanyAdminControlSettings,
  saveCompanyAdminControlSettings,
} from "@/lib/companyAdminControl";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import {
  DEFAULT_RATE_FORMULA,
  normalizeRateFormula,
  validateRateFormula,
} from "@/lib/rateFormula";

function isAdmin(req: NextRequest) {
  const headerRole = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (headerRole === "ADMIN") return true;
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  return String(payload?.role || "").toUpperCase() === "ADMIN";
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    // No company resolved is not an error here — a document page asking "does
    // this company use a formula?" should hear "no" and render normally.
    if (!companyId) return NextResponse.json(DEFAULT_RATE_FORMULA);

    const settings = await getCompanyAdminControlSettings(companyId);
    return NextResponse.json(settings.rateFormula);
  } catch {
    return NextResponse.json(DEFAULT_RATE_FORMULA);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const rateFormula = normalizeRateFormula(await req.json());

    // Turning the switch on with a broken formula would break data entry on
    // every document it is wired to, so the switch is what we refuse — not the
    // save. A half-finished setup can still be parked with `enabled: false`.
    if (rateFormula.enabled) {
      const problems = validateRateFormula(rateFormula);
      if (problems.length) {
        return NextResponse.json(
          { error: problems[0].message, problems },
          { status: 400 }
        );
      }
    }

    const userId = req.headers.get("x-user-id");
    const saved = await saveCompanyAdminControlSettings(companyId, userId, { rateFormula });
    return NextResponse.json(saved.rateFormula);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
