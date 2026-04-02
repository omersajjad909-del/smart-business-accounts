import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const prismaAny = prisma as any;

function parseJsonArray(val: string | null): string[] {
  if (!val) return [];
  try {
    const arr = JSON.parse(val);
    return Array.isArray(arr) ? arr.map((s: any) => String(s).toLowerCase().trim()) : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { code: string; plan?: string };
    const { code, plan } = body;

    if (!code) return NextResponse.json({ error: "Coupon code required" }, { status: 400 });

    // Who is validating — from dashboard headers (injected by layout)
    const userId    = req.headers.get("x-user-id")    || null;
    const companyId = req.headers.get("x-company-id") || null;

    const coupon = await prismaAny.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon) return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 });
    if (!coupon.active) return NextResponse.json({ error: "This coupon is no longer active" }, { status: 400 });
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ error: "This coupon has expired" }, { status: 400 });
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "This coupon has reached its usage limit" }, { status: 400 });
    }
    if (coupon.applicableTo && plan && coupon.applicableTo !== plan) {
      return NextResponse.json({ error: `This coupon is only valid for the ${coupon.applicableTo} plan` }, { status: 400 });
    }

    // ── Targeting checks ─────────────────────────────────────────
    const allowedEmails        = parseJsonArray(coupon.allowedEmails);
    const allowedCompanyIds    = parseJsonArray(coupon.allowedCompanyIds);
    const allowedBusinessTypes = parseJsonArray(coupon.allowedBusinessTypes);
    const allowedCountries     = parseJsonArray(coupon.allowedCountries);

    const hasEmailTarget        = allowedEmails.length > 0;
    const hasCompanyTarget      = allowedCompanyIds.length > 0;
    const hasBusinessTypeTarget = allowedBusinessTypes.length > 0;
    const hasCountryTarget      = allowedCountries.length > 0;

    const isTargeted = hasEmailTarget || hasCompanyTarget || hasBusinessTypeTarget || hasCountryTarget;

    if (isTargeted) {
      // Fetch user email if needed
      let userEmail: string | null = null;
      if (hasEmailTarget && userId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        userEmail = user?.email?.toLowerCase().trim() ?? null;
      }

      // Fetch company details if needed
      let company: { id: string; businessType: string; country: string | null } | null = null;
      if ((hasCompanyTarget || hasBusinessTypeTarget || hasCountryTarget) && companyId) {
        company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { id: true, businessType: true, country: true },
        });
      }

      // Check email restriction
      if (hasEmailTarget) {
        if (!userEmail || !allowedEmails.includes(userEmail)) {
          return NextResponse.json({ error: "This coupon is not available for your account" }, { status: 403 });
        }
      }

      // Check company restriction
      if (hasCompanyTarget) {
        if (!companyId || !allowedCompanyIds.includes(companyId.toLowerCase())) {
          return NextResponse.json({ error: "This coupon is not available for your company" }, { status: 403 });
        }
      }

      // Check business type restriction
      if (hasBusinessTypeTarget) {
        const bt = company?.businessType?.toLowerCase().trim() ?? null;
        if (!bt || !allowedBusinessTypes.includes(bt)) {
          return NextResponse.json({
            error: `This coupon is only for: ${allowedBusinessTypes.join(", ")} businesses`,
          }, { status: 403 });
        }
      }

      // Check country restriction
      if (hasCountryTarget) {
        const companyCountry = company?.country?.toLowerCase().trim() ?? null;
        if (!companyCountry) {
          return NextResponse.json({ error: "This coupon is restricted to specific countries" }, { status: 403 });
        }
        // Match against both full country names (lowercase) and ISO codes stored in DB
        const matched = allowedCountries.some(c => companyCountry.includes(c) || c.includes(companyCountry));
        if (!matched) {
          return NextResponse.json({ error: "This coupon is not available in your region" }, { status: 403 });
        }
      }
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id:           coupon.id,
        code:         coupon.code,
        type:         coupon.type,
        value:        coupon.value,
        applicableTo: coupon.applicableTo,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
