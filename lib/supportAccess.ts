/**
 * Customer-granted support access.
 *
 * Finova staff have no standing access to a trial customer's account. When a
 * customer wants someone to look at their setup they grant access for a fixed
 * window, and /api/admin/companies/impersonate refuses a trial company without
 * an unexpired grant. A grant is an ActivityLog row, the newest one decides, and
 * revoking is a row of its own — so the history of who allowed what, and when,
 * stays in the log.
 */

import { prisma } from "@/lib/prisma";

export const SUPPORT_ACCESS_DAYS = 7;
const GRANT = "SUPPORT_ACCESS_GRANT";
const REVOKE = "SUPPORT_ACCESS_REVOKE";

/** When the current grant ends, or null when there is none. */
export async function getSupportAccessUntil(companyId: string): Promise<Date | null> {
  const last = await prisma.activityLog.findFirst({
    where: { companyId, action: { in: [GRANT, REVOKE] } },
    orderBy: { createdAt: "desc" },
    select: { action: true, details: true },
  });
  if (!last || last.action !== GRANT) return null;
  try {
    const until = new Date(JSON.parse(last.details || "{}").until);
    return until.getTime() > Date.now() ? until : null;
  } catch {
    return null;
  }
}

export async function grantSupportAccess(companyId: string, userId?: string | null): Promise<Date> {
  const until = new Date(Date.now() + SUPPORT_ACCESS_DAYS * 86_400_000);
  await prisma.activityLog.create({
    data: { companyId, userId: userId || null, action: GRANT, details: JSON.stringify({ until }) },
  });
  return until;
}

export async function revokeSupportAccess(companyId: string, userId?: string | null): Promise<void> {
  await prisma.activityLog.create({ data: { companyId, userId: userId || null, action: REVOKE } });
}
