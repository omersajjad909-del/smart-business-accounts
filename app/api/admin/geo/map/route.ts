import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { getCountryCenter, isFiniteCoordinate } from "@/lib/geoMapData";
import { requireAdmin } from "@/lib/adminAuth";

function safeDecode(val: string | null | undefined): string | null {
  if (!val) return null;
  try { return decodeURIComponent(val); } catch { return val; }
}

function isAdmin(req: NextRequest) {
  const headerRole = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (headerRole === "ADMIN") return true;
  try {
    const payload = verifyJwt(getTokenFromRequest(req as any)!);
    return String(payload?.role || "").toUpperCase() === "ADMIN";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Demo sandboxes and internal test workspaces are not customers. Pinning
    // them put seeded names ("Fast Track Distribution", "Mega Wholesale Depot")
    // on the map and made the counters disagree with the company list. Same
    // filter as /api/admin/companies/all and /api/admin/dashboard.
    const companies = await prisma.company.findMany({
      where: { isDemo: false, isInternalTest: false },
      select: { id: true, name: true, country: true, businessType: true, plan: true, baseCurrency: true },
      orderBy: { createdAt: "desc" },
    });
    const realCompanyIds = companies.map((c) => c.id);

    const [branches, logs, visits] = await Promise.all([
      // Branch has no isDemo of its own — it inherits it from its company, so
      // scoping to the filtered company ids is what keeps demo depots off the map.
      prisma.branch.findMany({
        where: { companyId: { in: realCompanyIds } },
        select: { id: true, companyId: true, code: true, name: true, city: true, isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      // These logs carry the exact lat/lon each pin is placed by. Unscoped, a
      // burst of demo-sandbox logs could fill the 5000 budget and push a real
      // company's coordinates out — dropping it back to a country-centre pin.
      prisma.activityLog.findMany({
        where: { action: "COMPANY_ADMIN_CONTROL", companyId: { in: realCompanyIds } },
        select: { companyId: true, details: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
      (prisma as any).siteVisit.findMany({
        where: { visitedAt: { gte: new Date(Date.now() - 30 * 86400 * 1000) } },
        select: { lat: true, lon: true, country: true, countryName: true, city: true, flag: true, page: true, device: true, visitedAt: true },
        orderBy: { visitedAt: "desc" },
        take: 1000,
      }).catch(() => []),
    ]);

    const settingsByCompany = new Map<string, any>();
    for (const log of logs) {
      if (!log.companyId || settingsByCompany.has(log.companyId)) continue;
      try {
        settingsByCompany.set(log.companyId, log.details ? JSON.parse(log.details) : {});
      } catch {
        settingsByCompany.set(log.companyId, {});
      }
    }

    const companyPins = companies.map((company) => {
      const settings = settingsByCompany.get(company.id) || {};
      const identity = settings.companyIdentity || {};
      const exactLat = isFiniteCoordinate(identity.latitude) ? identity.latitude : null;
      const exactLon = isFiniteCoordinate(identity.longitude) ? identity.longitude : null;
      const fallback = getCountryCenter(company.country);

      return {
        type: "company",
        companyId: company.id,
        label: company.name,
        subtitle: company.businessType || "business",
        country: company.country || null,
        lat: exactLat ?? fallback?.lat ?? null,
        lon: exactLon ?? fallback?.lon ?? null,
        precision: exactLat !== null && exactLon !== null ? "exact" : "country",
        address: identity.legalAddress || null,
        city: identity.city || null,
        plan: company.plan || null,
      };
    }).filter((pin) => pin.lat !== null && pin.lon !== null);

    const branchPins = branches.map((branch) => {
      const company = companies.find((row) => row.id === branch.companyId);
      const settings = settingsByCompany.get(branch.companyId) || {};
      const branchGeo = settings.branchLocations?.[branch.id] || {};
      const exactLat = isFiniteCoordinate(branchGeo.latitude) ? branchGeo.latitude : null;
      const exactLon = isFiniteCoordinate(branchGeo.longitude) ? branchGeo.longitude : null;
      const fallback = getCountryCenter(company?.country || null);

      return {
        type: "branch",
        branchId: branch.id,
        companyId: branch.companyId,
        label: `${branch.code} - ${branch.name}`,
        subtitle: company?.name || "Company",
        country: company?.country || null,
        lat: exactLat ?? fallback?.lat ?? null,
        lon: exactLon ?? fallback?.lon ?? null,
        precision: exactLat !== null && exactLon !== null ? "exact" : "country",
        address: branchGeo.address || null,
        city: branch.city || null,
        isActive: branch.isActive,
      };
    }).filter((pin) => pin.lat !== null && pin.lon !== null);

    const visitorPins = (visits || [])
      .map((visit: any) => {
        const exactLat = isFiniteCoordinate(visit.lat) ? visit.lat : null;
        const exactLon = isFiniteCoordinate(visit.lon) ? visit.lon : null;
        const fallback = getCountryCenter(visit.country);

        const city    = safeDecode(visit.city);
        const page    = safeDecode(visit.page);
        const cName   = safeDecode(visit.countryName);
        return {
          type: "visitor",
          label: cName || visit.country || "Visitor",
          subtitle: city || page || "Anonymous visit",
          country: visit.country || null,
          lat: exactLat ?? fallback?.lat ?? null,
          lon: exactLon ?? fallback?.lon ?? null,
          precision: exactLat !== null && exactLon !== null ? "exact" : "country",
          city,
          page,
          device: visit.device || null,
          flag: visit.flag || null,
          visitedAt: visit.visitedAt,
        };
      })
      .filter((pin: any) => pin.lat !== null && pin.lon !== null);

    return NextResponse.json({
      companies: companyPins,
      branches: branchPins,
      visitors: visitorPins,
      stats: {
        companies: companyPins.length,
        exactCompanies: companyPins.filter((pin) => pin.precision === "exact").length,
        branches: branchPins.length,
        exactBranches: branchPins.filter((pin) => pin.precision === "exact").length,
        visitors: visitorPins.length,
        exactVisitors: visitorPins.filter((pin: any) => pin.precision === "exact").length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load geo map" }, { status: 500 });
  }
}
