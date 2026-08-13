// FILE: lib/siteStatus.ts
//
// Has the product been launched? — the state behind the Launch Now button.
//
// This is the same flag lib/signupGate.ts gates every buy button, signup URL
// and checkout API on, read here for the admin panel. One key, so the button
// and the doors can never disagree.
//
// Default is NOT launched, matching the signup gate's own default. Pre-launch
// is the safe state: a missing row, a bad row or a database that will not
// answer must never be read as "we are selling now".

import { prisma } from "@/lib/prisma";
import { SITE_LAUNCHED_KEY, SIGNUPS_OPEN } from "@/lib/signupGate";

export type SiteStatus = {
  /** Buy buttons enabled and signup URLs open. */
  live: boolean;
  launchedAt: string | null;
  launchedBy: string | null;
  /** True when NEXT_PUBLIC_SIGNUPS_OPEN forced it open at build time. */
  forcedByEnv: boolean;
};

export async function getSiteStatus(): Promise<SiteStatus> {
  try {
    const [setting, launch] = await Promise.all([
      prisma.activityLog.findFirst({
        where: {
          action: "ADMIN_SETTING",
          details: { startsWith: `{"key":"${SITE_LAUNCHED_KEY}"` },
        },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }).catch(() => null),
      prisma.activityLog.findFirst({
        where: { action: "SITE_LAUNCHED" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, details: true },
      }).catch(() => null),
    ]);

    let flag = false;
    try {
      flag = JSON.parse(setting?.details || "{}")?.value === true;
    } catch {}

    let launchedBy: string | null = null;
    try {
      launchedBy = JSON.parse(launch?.details || "{}")?.by ?? null;
    } catch {}

    return {
      live: SIGNUPS_OPEN || flag,
      launchedAt: launch?.createdAt?.toISOString() ?? null,
      launchedBy,
      forcedByEnv: SIGNUPS_OPEN,
    };
  } catch {
    return { live: SIGNUPS_OPEN, launchedAt: null, launchedBy: null, forcedByEnv: SIGNUPS_OPEN };
  }
}
