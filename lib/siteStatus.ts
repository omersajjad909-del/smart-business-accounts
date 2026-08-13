// FILE: lib/siteStatus.ts
//
// Whether the public marketing site is open to the world.
//
// The launch flag lives in the same ActivityLog `ADMIN_SETTING` store the rest
// of /admin/settings uses, so there is no new table and no new migration. It is
// read by the marketing layout on every render and written only by
// /api/admin/launch.
//
// The default is LIVE. The site has been serving real visitors for months, so a
// missing row must never be read as "not launched yet" — that would take a
// running product offline the moment this code deployed. Going dark is only
// ever the result of an explicit "take offline" action.

import { prisma } from "@/lib/prisma";

export const SITE_LIVE_KEY = "siteLive";

export type SiteStatus = {
  live: boolean;
  /** When the site was last launched, if it ever was. */
  launchedAt: string | null;
  launchedBy: string | null;
};

/** Reads one ADMIN_SETTING key, newest write wins. */
async function readSetting(key: string): Promise<unknown> {
  const log = await prisma.activityLog
    .findFirst({
      where: { action: "ADMIN_SETTING", details: { startsWith: `{"key":"${key}"` } },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    })
    .catch(() => null);
  if (!log?.details) return undefined;
  try {
    return JSON.parse(log.details)?.value;
  } catch {
    return undefined;
  }
}

export async function getSiteStatus(): Promise<SiteStatus> {
  try {
    const [live, launch] = await Promise.all([
      readSetting(SITE_LIVE_KEY),
      prisma.activityLog
        .findFirst({
          where: { action: "SITE_LAUNCHED" },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, details: true },
        })
        .catch(() => null),
    ]);

    let launchedBy: string | null = null;
    try {
      launchedBy = JSON.parse(launch?.details || "{}")?.by ?? null;
    } catch {}

    return {
      // Only an explicit `false` closes the site. Anything else — no row, a
      // malformed row, a failed read — means live.
      live: live !== false,
      launchedAt: launch?.createdAt?.toISOString() ?? null,
      launchedBy,
    };
  } catch {
    // A database hiccup must not black out the public site.
    return { live: true, launchedAt: null, launchedBy: null };
  }
}
