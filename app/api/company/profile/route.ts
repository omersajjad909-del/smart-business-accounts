import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { currencyByCountry } from "@/lib/currency";

export async function PUT(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req as any);
    const payload = token ? verifyJwt(token) : null;
    const userId = (req.headers.get("x-user-id") || payload?.userId || "").toString();
    const role = String(req.headers.get("x-user-role") || payload?.role || "").toUpperCase();
    const companyId = (req.headers.get("x-company-id") || payload?.companyId || "").toString();

    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "User required" }, { status: 400 });
    }

    const body = await req.json();
    const { companyName, logoUrl, fiscalYearStart, baseCurrency, country } = body || {};

    // Always try to update known columns (name), extra columns best-effort
    const updates: any = {};
    if (companyName) updates.name = companyName;
    if (fiscalYearStart) updates.fiscalYearStart = fiscalYearStart;
    if (country) updates.country = country;
    // Auto-set baseCurrency from country if not explicitly provided
    if (baseCurrency) updates.baseCurrency = baseCurrency;
    else if (country) updates.baseCurrency = currencyByCountry(country);
    if (logoUrl) updates.logoUrl = logoUrl;

    let updated: any = null;
    try {
      updated = await prisma.company.update({
        where: { id: companyId },
        data: updates as any,
      } as any);
    } catch (_e) {
      // If schema columns don't exist, fallback to minimal update
      if (companyName) {
        updated = await prisma.company.update({
          where: { id: companyId },
          data: { name: companyName },
        });
      } else {
        updated = await prisma.company.findUnique({ where: { id: companyId } });
      }
    }

    // Log the profile update with full payload for audit
    try {
      await prisma.activityLog.create({
        data: {
          companyId,
          userId,
          action: "COMPANY_PROFILE_UPDATED",
          details: JSON.stringify({ companyName, logoUrl, fiscalYearStart, baseCurrency }),
        },
      });
    } catch {}

    return NextResponse.json({ ok: true, company: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Update failed" }, { status: 500 });
  }
}

