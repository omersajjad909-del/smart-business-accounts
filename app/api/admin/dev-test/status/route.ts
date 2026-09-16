import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_SESSION_TTL_MS,
  cookieMaxAgeFor,
  getTokenFromRequest,
  signJwt,
  verifyJwt,
} from "@/lib/auth";

/**
 * Renew a test session once its token is more than a day old.
 *
 * Every dashboard page asks this route whether it is in test mode, so it is
 * already the one request guaranteed to happen whenever the admin is actually
 * working in the test workspace. Refreshing here makes the session roll with
 * use: a test workspace being used does not expire, and one abandoned closes
 * itself a week later like any other login.
 *
 * A day's grace rather than renewing on every call — there is no point minting
 * a token and rewriting a cookie for each navigation.
 */
const RENEW_WHEN_REMAINING_MS = DEFAULT_SESSION_TTL_MS - 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({ isTestMode: false });
  }

  const isTestMode = payload.isTestMode === true;
  const res = NextResponse.json({
    isTestMode,
    testBusinessType: payload.testBusinessType || null,
    testPlan: payload.testPlan || null,
    originCompanyId: payload.originCompanyId || null,
    testCompanyId: isTestMode ? payload.companyId : null,
  });

  /* Only a test session, and deliberately nothing else. An impersonation token
     is short-lived on purpose — an admin sitting inside a customer's books
     should have to renew that decision — so this must never be the thing that
     extends one. The token proves what it is: it is signed, verifyJwt has
     already checked the signature and the expiry, and the claims are copied
     across untouched apart from the timestamps. */
  if (isTestMode) {
    const remainingMs = cookieMaxAgeFor(payload) * 1000;
    if (remainingMs > 0 && remainingMs < RENEW_WHEN_REMAINING_MS) {
      const claims: Record<string, unknown> = { ...payload };
      // signJwt writes its own; carrying the old ones over would re-mint the
      // same expiry and the session would never actually move forward.
      delete claims.iat;
      delete claims.exp;
      delete claims.jti;
      res.cookies.set("sb_auth", signJwt(claims), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: Math.floor(DEFAULT_SESSION_TTL_MS / 1000),
      });
    }
  }

  return res;
}
