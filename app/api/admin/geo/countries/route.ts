// FILE: app/api/admin/geo/countries/route.ts
// Country data from:
// 1. Company.country column
// 2. Session IP geolocation (ip-api.com free tier)
// 3. ActivityLog COMPANY_COUNTRY_SET

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { countryName, normalizeCountryCode } from "@/lib/countries";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    // Auth check
    let role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") {
      const token = getTokenFromRequest(req as any);
      const payload = token ? verifyJwt(token) : null;
      role = String(payload?.role || "").toUpperCase();
      if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Company.country
    // Demo sandboxes and internal test workspaces are not customers — counting
    // them here inflated "Total Companies" to a number that never matched the
    // company list, and dropped fake pins on the map. Same filter as
    // /api/admin/companies/all and /api/admin/dashboard.
    const companies = await prisma.company.findMany({
      where: { isDemo: false, isInternalTest: false },
      select: { id: true, country: true },
    });

    // Every downstream source (activity logs, sessions) is keyed by companyId,
    // so this set is what keeps a demo company from sneaking back in via them.
    const realCompanyIds = new Set(companies.map((c) => c.id));

    const countryByCompany = new Map<string, string>();
    for (const c of companies) {
      if ((c as any).country) countryByCompany.set(c.id, normalizeCountryCode(String((c as any).country)));
    }

    // 2. ActivityLog country logs
    try {
      const yearAgo = new Date(Date.now() - 365 * 86400 * 1000);
      const countryLogs = await prisma.activityLog.findMany({
        where: { action: "COMPANY_COUNTRY_SET", createdAt: { gte: yearAgo } },
        orderBy: { createdAt: "desc" },
        select: { companyId: true, details: true },
      });
      for (const l of countryLogs) {
        if (!l.companyId || !realCompanyIds.has(l.companyId)) continue;
        if (countryByCompany.has(l.companyId)) continue;
        try {
          const d = l.details ? JSON.parse(l.details) : null;
          const raw = String(d?.country || d?.country_code || "");
          const code = raw ? normalizeCountryCode(raw) : "";
          if (code) countryByCompany.set(l.companyId, code);
        } catch {}
      }
    } catch {}

    // 3. Session IP → country (from stored ip_country field or ip field)
    const since30d = new Date(Date.now() - 30 * 86400 * 1000);
    let sessions: any[] = [];
    try {
      sessions = await (prisma as any).session.findMany({
        where: { createdAt: { gte: since30d } },
        select: { companyId: true, userId: true, country: true, ip: true },
      });
    } catch {
      try {
        // fallback — no country/ip field
        sessions = await (prisma as any).session.findMany({
          where: { createdAt: { gte: since30d } },
          select: { companyId: true, userId: true },
        });
      } catch {}
    }

    // Build companies per country
    const companyByCountry: Record<string, Set<string>> = {};
    for (const [cid, code] of countryByCompany.entries()) {
      if (!code) continue;
      if (!companyByCountry[code]) companyByCountry[code] = new Set();
      companyByCountry[code].add(cid);
    }

    // Build active users per country (from session)
    const userByCountry: Record<string, Set<string>> = {};
    for (const s of sessions) {
      // A demo visitor's session would otherwise re-add its throwaway company
      // to the country tally and count the sandbox user as an active user.
      if (s.companyId && !realCompanyIds.has(s.companyId)) continue;
      // Try session.country first, then company country
      const rawCode = String(s.country || "");
      let code = rawCode ? normalizeCountryCode(rawCode) : "";
      if (!code && s.companyId) code = countryByCompany.get(s.companyId) || "";
      if (!code) continue;
      if (!userByCountry[code]) userByCountry[code] = new Set();
      if (s.userId) userByCountry[code].add(s.userId);
      // Also count company
      if (s.companyId) {
        if (!companyByCountry[code]) companyByCountry[code] = new Set();
        companyByCountry[code].add(s.companyId);
      }
    }

    const allCodes = Array.from(new Set([
      ...Object.keys(companyByCountry),
      ...Object.keys(userByCountry),
    ]));

    const rows = allCodes
      .map(code => ({
        country:        code,
        countryName:    countryName(code),
        companies:      companyByCountry[code]?.size  || 0,
        activeUsers30d: userByCountry[code]?.size     || 0,
      }))
      .filter(r => r.companies > 0 || r.activeUsers30d > 0)
      .sort((a, b) => b.activeUsers30d - a.activeUsers30d);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("[geo/countries]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}