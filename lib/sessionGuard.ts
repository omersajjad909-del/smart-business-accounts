// FILE: lib/sessionGuard.ts
//
// Server-side session validation for account-security endpoints.
//
// `verifyJwt` only proves a cookie was signed by us and has not expired — it
// cannot know the session was *revoked*. Password reset, email change and
// logout all delete the user's `Session` rows; without a lookup against that
// table those deletions are cosmetic and a stolen cookie keeps working until
// its own expiry. Any route that can take over an account (change password,
// change email, disable 2FA) must go through `requireActiveSession` so that
// revocation is actually enforced.

import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

export type ActiveSession = {
  userId: string;
  companyId: string;
  role: string;
  token: string;
  /** Set when this is an admin "Open as Owner" handoff rather than a real login. */
  impersonatedBy?: string;
  demo?: boolean;
};

export async function requireActiveSession(
  req: Request,
): Promise<ActiveSession | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const payload = verifyJwt(token);
  const userId = String(payload?.userId || payload?.id || "");
  if (!payload || !userId) return null;

  // Impersonation handoff tokens are minted by the admin panel and never get a
  // Session row. They carry their own 1h expiry and are audited separately, so
  // they are accepted here without a DB session — but see `assertNotImpersonated`.
  if (!payload.impersonatedBy) {
    const session = await prisma.session.findUnique({
      where: { token },
      select: { id: true, userId: true, expiresAt: true },
    });
    if (!session || session.userId !== userId) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, active: true },
  });
  if (!user?.active) return null;

  return {
    userId,
    companyId: String(payload.companyId || payload.defaultCompanyId || ""),
    role: String(payload.role || "").toUpperCase(),
    token,
    impersonatedBy: payload.impersonatedBy ? String(payload.impersonatedBy) : undefined,
    demo: payload.demo === true,
  };
}

/**
 * Credential-changing actions must never be reachable while impersonating or
 * inside a demo sandbox — an admin viewing a tenant must not be able to lock
 * the real owner out of their own account.
 */
export function isCredentialChangeAllowed(session: ActiveSession): boolean {
  return !session.impersonatedBy && !session.demo;
}
