import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { currencyByCountry } from "@/lib/currency";

export async function PATCH(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { name, country, baseCurrency } = await req.json();

    // Auto-set baseCurrency from country if user didn't explicitly pick one
    const resolvedCurrency = baseCurrency
      ? String(baseCurrency).toUpperCase()
      : country ? currencyByCountry(String(country)) : undefined;

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(country !== undefined ? { country: String(country) } : {}),
        ...(resolvedCurrency ? { baseCurrency: resolvedCurrency } : {}),
      },
      select: { name: true, country: true, baseCurrency: true },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
