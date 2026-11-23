import { prisma } from "@/lib/prisma";

/**
 * A Dev Test token is minted directly by the admin console, so unlike a real login it never got a
 * `Session` row — and `requireActiveSession` (used by every school API) rejects a token it cannot find
 * there. The result was a test workspace whose data was safely in the database but whose pages
 * showed nothing, because every request came back 401.
 *
 * This writes the row a login would have. It is deliberately narrow: only for a company flagged
 * `isInternalTest`, so it can never be used to register a session into a customer's company.
 * Idempotent — safe to call on every status check.
 */
export async function ensureTestSession(token: string, claims: { userId: string; companyId: string }, expiresAt: Date): Promise<boolean> {
  if (!token || !claims.userId || !claims.companyId) return false;
  const existing = await prisma.session.findUnique({ where: { token }, select: { id: true } });
  if (existing) return true;
  const company = await prisma.company.findUnique({ where: { id: claims.companyId }, select: { isInternalTest: true } });
  if (!company?.isInternalTest) return false;
  await prisma.session.create({ data: { userId: claims.userId, companyId: claims.companyId, token, expiresAt } });
  return true;
}
