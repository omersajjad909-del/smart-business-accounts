import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCompanyNo } from "@/lib/companyRef";
import { countryName, normalizeCountryCode } from "@/lib/countries";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // The demo sandbox seeds a fresh copy of the same golden companies for
    // every visitor, so each seeded name appeared once per demo session — the
    // duplicate "Global Link Import & Export" rows with identical totals were
    // distinct companyIds, not a broken groupBy. Scoping the aggregate to real
    // companies removes the demo rows and the duplication with them.
    const realCompanies = await prisma.company.findMany({
      where: { isDemo: false, isInternalTest: false },
      select: { id: true, companyNo: true, name: true, country: true },
    });
    if (!realCompanies.length) return NextResponse.json({ rows: [] });

    const invs = await prisma.salesInvoice.groupBy({
      by: ["companyId"],
      where: { date: { gte: since }, companyId: { in: realCompanies.map((c) => c.id) } },
      _count: { id: true },
      _sum: { total: true },
    } as any);
    const map = new Map(realCompanies.map(c => [c.id, c]));
    const rows = invs
      .map((g: any) => ({
        id: g.companyId,
        companyNo: map.get(g.companyId)?.companyNo ?? null,
        // Never fall back to the UUID for a display name — a deleted company
        // shows its short number instead. See lib/companyRef.ts.
        name: map.get(g.companyId)?.name || formatCompanyNo(map.get(g.companyId)?.companyNo, g.companyId),
        // Raw Company.country is "PK" on some rows and "Pakistan" on others —
        // this table showed both spellings side by side. Label it once.
        country: countryName(normalizeCountryCode(map.get(g.companyId)?.country)) || null,
        invoices: g._count.id || 0,
        amount: Number(g._sum.total || 0),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
