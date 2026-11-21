import { prisma } from "@/lib/prisma";
import { SIGNUPS_OPEN, SITE_LAUNCHED_KEY } from "@/lib/signupGate";

// Read on every proxied request, so it is cached briefly rather than hitting the
// database each time. A few seconds of staleness on launch day is invisible.
const CACHE_TTL_MS = 15_000;
let cached: { open: boolean; at: number } | null = null;

export async function getSignupsOpen(): Promise<boolean> {
  if (SIGNUPS_OPEN) return true;

  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.open;

  let open = false;
  try {
    const row = await prisma.activityLog.findFirst({
      where: {
        action: "ADMIN_SETTING",
        details: { startsWith: `{"key":"${SITE_LAUNCHED_KEY}"` },
      },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    open = JSON.parse(row?.details || "{}")?.value === true;
  } catch {
    // Keep whatever we last knew rather than slamming the doors mid-traffic on
    // a transient database error; closed on a cold start.
    open = cached?.open ?? false;
  }

  cached = { open, at: now };
  return open;
}

