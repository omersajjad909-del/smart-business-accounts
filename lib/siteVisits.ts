/**
 * lib/siteVisits.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * One reader for marketing-site visits, because there are two places they live.
 *
 * `/api/track/visit` writes to the SiteVisit table, and falls back to an
 * ActivityLog row with action "SITE_VISIT" when that write fails. For a long
 * stretch it ALWAYS failed — the payload carried a `region` field the model
 * does not have, so Prisma rejected every create — and the whole backlog went
 * to ActivityLog. The admin pages only ever read SiteVisit, which succeeded
 * and returned nothing, so Web Metrics and the CRM visitor tab showed 0.
 *
 * The write bug is fixed, but that backlog is real traffic and should not stay
 * invisible. Every visitor surface reads through here so both sources are
 * merged and no page can drift back to reading just one of them.
 */

import { prisma } from "@/lib/prisma";

export type SiteVisitRow = {
  sessionId: string | null;
  page: string | null;
  country: string | null;
  countryName: string | null;
  city: string | null;
  flag: string | null;
  device: string | null;
  browser: string | null;
  lat: number | null;
  lon: number | null;
  visitedAt: Date;
};

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Rows written before the tracker stopped defaulting coordinates hold (0, 0),
 * which is Null Island — a real point in the Atlantic, so those visits were
 * drawn there as "exact" pins. Treat the pair as absent, and let the caller
 * fall back to the country centre like any other unlocated visit.
 */
const coords = (rawLat: unknown, rawLon: unknown): { lat: number | null; lon: number | null } => {
  const lat = num(rawLat);
  const lon = num(rawLon);
  if (lat === 0 && lon === 0) return { lat: null, lon: null };
  return { lat, lon };
};

const str = (v: unknown): string | null => {
  const s = v == null ? "" : String(v);
  return s ? s : null;
};

/**
 * All visits since `since`, newest first, from both storage locations.
 *
 * `take` caps each source before merging, so a large backlog in one cannot
 * starve the other out of the result.
 */
export async function readSiteVisits(since: Date, take = 5000): Promise<SiteVisitRow[]> {
  const [fromTable, fromLogs] = await Promise.all([
    (prisma as any).siteVisit
      .findMany({
        where: { visitedAt: { gte: since } },
        select: {
          sessionId: true, page: true, country: true, countryName: true, city: true,
          flag: true, device: true, browser: true, lat: true, lon: true, visitedAt: true,
        },
        orderBy: { visitedAt: "desc" },
        take,
      })
      .catch(() => [] as any[]),
    prisma.activityLog
      .findMany({
        where: { action: "SITE_VISIT", createdAt: { gte: since } },
        select: { details: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take,
      })
      .catch(() => [] as Array<{ details: string | null; createdAt: Date }>),
  ]);

  const rows: SiteVisitRow[] = (fromTable as any[]).map((v) => ({
    sessionId:   str(v.sessionId),
    page:        str(v.page),
    country:     str(v.country),
    countryName: str(v.countryName),
    city:        str(v.city),
    flag:        str(v.flag),
    device:      str(v.device),
    browser:     str(v.browser),
    ...coords(v.lat, v.lon),
    visitedAt:   v.visitedAt,
  }));

  for (const log of fromLogs) {
    if (!log.details) continue;
    try {
      const d = JSON.parse(log.details);
      rows.push({
        sessionId:   str(d.sessionId),
        page:        str(d.page),
        country:     str(d.country),
        countryName: str(d.countryName),
        city:        str(d.city),
        flag:        str(d.flag),
        device:      str(d.device),
        browser:     str(d.browser),
        ...coords(d.lat, d.lon),
        // The logged payload carries its own visitedAt; createdAt is the same
        // moment and is the reliable fallback if the JSON is malformed.
        visitedAt:   d.visitedAt ? new Date(d.visitedAt) : log.createdAt,
      });
    } catch {
      /* a row we cannot parse is a row we cannot count */
    }
  }

  return rows.sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime());
}
