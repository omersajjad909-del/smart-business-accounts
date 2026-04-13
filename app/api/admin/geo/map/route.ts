import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { getCountryCenter, isFiniteCoordinate } from "@/lib/geoMapData";

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
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [companies, branches, logs, visits] = await Promise.all([
      prisma.company.findMany({
        select: { id: true, name: true, country: true, businessType: true, plan: true, baseCurrency: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.branch.findMany({
        select: { id: true, companyId: true, code: true, name: true, city: true, isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.activityLog.findMany({
        where: { action: "COMPANY_ADMIN_CONTROL" },
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

        return {
          type: "visitor",
          label: visit.countryName || visit.country || "Visitor",
          subtitle: visit.city || visit.page || "Anonymous visit",
          country: visit.country || null,
          lat: exactLat ?? fallback?.lat ?? null,
          lon: exactLon ?? fallback?.lon ?? null,
          precision: exactLat !== null && exactLon !== null ? "exact" : "country",
          city: visit.city || null,
          page: visit.page || null,
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
        exactVisitors: visitorPins.filter((pin) => pin.precision === "exact").length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load geo map" }, { status: 500 });
  }
}
