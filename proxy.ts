import { NextRequest, NextResponse } from "next/server";
import { getAdminTokenFromRequest, getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { REF_COOKIE, REF_COOKIE_MAX_AGE, normalizeTrackingCode } from "@/lib/affiliateTracking";
import {
  WAITLIST_PATH,
  getSignupsOpen,
  isSignupApiRoute,
  isSignupPageRoute,
} from "@/lib/signupGate";

const FORGE_HOSTS = ["finovaforge.com", "www.finovaforge.com"];

/**
 * The admin console lives on its own, deliberately unguessable hostname.
 *
 * `admin.<domain>` is the first thing any scanner tries, so the console is not
 * served there — or anywhere on the public app domain. Set ADMIN_HOST (comma
 * separated if you need more than one) and point that DNS record at the same
 * deployment; nothing else about the app changes.
 *
 * On the app domain /admin and the admin APIs render an ordinary 404 — the
 * same page any nonexistent URL gets, so probing cannot tell the difference.
 */
const ADMIN_HOSTS = (process.env.ADMIN_HOST || "ikj.finovaos.app")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

/** Hosts where the split is not enforced, so local dev and previews still work. */
function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".vercel.app")
  );
}

/**
 * Paths the admin host is allowed to serve. Everything else there 404s.
 *
 * Pages are the strict part: no marketing site, no tenant dashboard, no
 * onboarding — a visitor who guesses the hostname finds only a login box.
 * APIs stay open because several console screens legitimately call endpoints
 * outside /api/admin (automation, chat, invitations), and those endpoints are
 * reachable on the app domain regardless, so refusing them here would break
 * the console without hiding anything.
 */
function isAdminHostPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    // Static assets: any path ending in a file extension.
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

/**
 * `/api/admin/*` is two things at once: the platform console AND a handful of
 * tenant-facing endpoints the customer dashboard has always called. Only these
 * prefixes are the tenant kind — they are company-scoped and do their own
 * permission checks. Everything else under /api/admin requires an admin
 * session and is invisible from the app domain.
 */
const TENANT_ADMIN_API = [
  "/api/admin/roles",
  "/api/admin/user-permissions",
  "/api/admin/notifications",
  "/api/admin/shift-settings",
  "/api/admin/cleanup-vouchers",
  "/api/admin/logs", // company-scoped for tenant callers, see the route
  "/api/admin/dev-test/",
  "/api/admin/cron/", // scheduler-authenticated, not cookie-authenticated
];

/** Render the standard Next 404 — indistinguishable from any unknown URL. */
function notFound(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/__not-found";
  url.search = "";
  const res = NextResponse.rewrite(url);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

// Per-request CSP nonce — server components read it from the x-nonce header.
// Base64 (RFC 4648) so it's safe inside CSP header + HTML attributes.
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

function buildCsp(nonce: string): string {
  // Same allowed hosts as before; script-src now includes nonce + strict-dynamic.
  // 'unsafe-inline' kept as a fallback for browsers that don't understand nonces
  // (modern browsers ignore it once a nonce is present, so this doesn't weaken CSP).
  const isProd = process.env.NODE_ENV === "production";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "'unsafe-inline'", // ignored by modern browsers when nonce/strict-dynamic present
    ...(isProd ? [] : ["'unsafe-eval'"]),
    "https://fonts.googleapis.com",
    "https://www.googletagmanager.com",
    "https://static.cloudflareinsights.com",
    "https://www.clarity.ms",
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://ipapi.co https://www.googletagmanager.com https://static.cloudflareinsights.com https://cloudflareinsights.com https://www.google-analytics.com https://www.google.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.clarity.ms",
    "worker-src 'self' blob: https://www.clarity.ms",
    "child-src 'self' blob:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function proxy(req: NextRequest) {
  // Per-request CSP nonce — server components read this via next/headers.
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // ── Forge hostname routing ──────────────────────────────────────
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (FORGE_HOSTS.includes(host)) {
    const { pathname, search } = req.nextUrl;
    const fwdHeaders = new Headers(req.headers);
    fwdHeaders.set("x-nonce", nonce);
    fwdHeaders.set("x-pathname", req.nextUrl.pathname);
    // Same reason as the main branch below: Next reads the nonce from here.
    fwdHeaders.set("Content-Security-Policy", csp);
    // Redirect /favicon.ico to the Finova Forge logo so Google Search picks it up.
    if (pathname === "/favicon.ico") {
      return NextResponse.redirect(new URL("/FinovaForge.png", req.url), { status: 301 });
    }
    // Skip rewrite for static files (any path with a file extension like .png, .svg, .ico, .txt, .json, etc.)
    // so /FinovaForge.png resolves to public/FinovaForge.png instead of /forge/FinovaForge.png.
    const isStaticFile = /\.[a-z0-9]+$/i.test(pathname);
    if (
      !isStaticFile &&
      !pathname.startsWith("/forge") &&
      !pathname.startsWith("/_next") &&
      !pathname.startsWith("/api")
    ) {
      const target = pathname === "/" ? "/forge/home" : `/forge${pathname}`;
      const res = NextResponse.rewrite(new URL(target + search, req.url), { request: { headers: fwdHeaders } });
      res.headers.set("Content-Security-Policy", csp);
      return res;
    }
    const res = NextResponse.next({ request: { headers: fwdHeaders } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }
  // ───────────────────────────────────────────────────────────────

  // ── Admin console hostname split ─────────────────────────────────────────
  // Decided before anything else touches the request, so neither host can be
  // talked into serving the other's routes.
  const pathname = req.nextUrl.pathname || "";
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApiPath = pathname.startsWith("/api/admin/");
  const onAdminHost = ADMIN_HOSTS.includes(host);
  // Never enforced on localhost or preview URLs — there is only one hostname
  // there and the console still has to be reachable.
  const hostSplitEnforced = ADMIN_HOSTS.length > 0 && !isLocalHost(host);

  if (onAdminHost) {
    // The admin host serves the console and nothing else. No marketing site,
    // no tenant dashboard, no tenant APIs.
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (!isAdminHostPath(pathname)) return notFound(req);
  } else if (hostSplitEnforced && (isAdminPath || isAdminApiPath)) {
    // The app domain does not admit that a console exists. Tenant-facing
    // endpoints that happen to sit under /api/admin stay reachable — they are
    // listed in TENANT_ADMIN_API below and are company-scoped, not platform.
    const tenantFacing =
      isAdminApiPath && TENANT_ADMIN_API.some((p) => pathname.startsWith(p));
    if (!tenantFacing) return notFound(req);
  }

  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("x-pathname", req.nextUrl.pathname);
  // Next.js stamps its own bootstrap/hydration scripts with the nonce only when
  // it can read the policy off the *request*. Setting it on the response alone
  // left those inline scripts unnonced, and `strict-dynamic` makes the browser
  // ignore the host allowlist — so every one of them was refused with
  // "Executing inline script violates the following Content Security Policy".
  headers.set("Content-Security-Policy", csp);

  // 🔥 Clear incoming sensitive headers to prevent spoofing
  headers.delete("x-user-id");
  headers.delete("x-user-role");
  headers.delete("x-user-name");
  headers.delete("x-company-id");

  const token = getTokenFromRequest(req as any);
  let decoded = null;

  if (token) {
    decoded = verifyJwt(token);
    if (decoded) {
      const resolvedUserId = decoded.userId || decoded.id || "";
      const resolvedRole = decoded.role ? String(decoded.role).toUpperCase() : "";
      if (resolvedUserId) {
        headers.set("x-user-id", String(resolvedUserId));
      }
      if (resolvedRole) {
        headers.set("x-user-role", resolvedRole);
      }
      if (decoded.name) headers.set("x-user-name", String(decoded.name));
      
      const companyId = decoded.companyId || decoded.defaultCompanyId || "system";
      headers.set("x-company-id", String(companyId));
    }
  }

  // NOTE: No cookie fallback — all auth must come through verified JWT (sb_auth cookie).
  // The old "user" cookie fallback was removed because it allowed role spoofing.

  // ── Admin identity ───────────────────────────────────────────────────────
  // Read from `sb_admin`, which only /api/admin/auth/2fa/verify mints, and only
  // once the authenticator code has been accepted (`otp: true`). On admin
  // paths these headers replace anything the tenant cookie set, so a route that
  // reads x-user-id for its audit log records the admin rather than whichever
  // tenant session happened to be open in the same browser.
  let adminClaims: Record<string, any> | null = null;
  if (isAdminPath || isAdminApiPath) {
    const adminToken = getAdminTokenFromRequest(req as any);
    if (adminToken) {
      const claims = verifyJwt(adminToken);
      if (claims && claims.scope === "admin" && claims.otp === true && claims.id) {
        adminClaims = claims;
        headers.set("x-user-id", String(claims.id));
        headers.set("x-user-role", "ADMIN");
        if (claims.name) headers.set("x-user-name", String(claims.name));
        headers.set("x-company-id", "system");
      }
    }
  }

  // ── Platform admin console gate ──────────────────────────────────────────
  // The console has its own cookie (`sb_admin`), minted only after both the
  // password and the authenticator code have been accepted. A tenant session
  // — even a company owner whose role is also "ADMIN" — carries `sb_auth` and
  // can never satisfy this. Every route re-checks the same thing server-side
  // via lib/adminAuth, so this edge check is a fast reject, not the guard.
  const adminAuthed = Boolean(adminClaims);

  if (isAdminApiPath && !TENANT_ADMIN_API.some((pp) => pathname.startsWith(pp))) {
    // The two-step sign-in endpoints must stay open — they are what mints the
    // session in the first place. Everything else needs a completed one.
    const isAdminAuthEndpoint = pathname.startsWith("/api/admin/auth/");
    if (!isAdminAuthEndpoint && !adminAuthed) {
      return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
    }
  }

  if (isAdminPath && pathname !== "/admin/login" && !adminAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ── Signup gate ──────────────────────────────────────────────────────────
  // Pre-launch: no new accounts. Enforced here rather than by disabling
  // buttons, because a disabled button still leaves the URL, the API and every
  // old link working. Visitors land on the waitlist so the interest is kept.
  //
  // Only the two route lists below are consulted, so the database read costs
  // nothing on ordinary traffic — and it is cached for a few seconds anyway.
  if ((isSignupApiRoute(pathname) || isSignupPageRoute(pathname)) && !(await getSignupsOpen())) {
    if (isSignupApiRoute(pathname)) {
      return NextResponse.json(
        { error: "Signups are not open yet", waitlist: WAITLIST_PATH },
        { status: 403 },
      );
    }
    if (isSignupPageRoute(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = WAITLIST_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Require auth for app pages.
  // `/admin` is deliberately absent: the admin console authenticates with
  // `sb_admin` and was handled above. Including it here sent signed-in admins
  // to the *tenant* /login for want of an `sb_auth` cookie they never have.
  const needsAuth =
    (pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding")) &&
    !pathname.startsWith("/onboarding/signup") &&
    !pathname.startsWith("/onboarding/choose-plan") &&
    !pathname.startsWith("/onboarding/payment") &&
    !pathname.startsWith("/onboarding/accept-invite");
  if (needsAuth) {
    const token = getTokenFromRequest(req as any);
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  // Endpoints a demo visitor may not reach: the platform's own billing and
  // account plumbing, anything that changes who can log in, and the admin
  // console. Everything else — the actual product — stays open.
  const DEMO_BLOCKED_API = [
    "/api/admin/",
    "/api/billing/",
    "/api/subscriptions",
    "/api/coupons",
    "/api/affiliates",
    "/api/referrals",
    "/api/backup",
    "/api/gdpr",
    "/api/ccpa",
    "/api/invitations",
    "/api/me/change-email",
    "/api/me/password",
    "/api/auth/change-password",
    "/api/auth/signup",
    "/api/plaid",
  ];

  // Readable so the screens render, but frozen against changes — a demo may
  // browse the team and company settings without editing who can sign in or
  // wiring a real integration.
  const DEMO_READONLY_API = [
    "/api/companies",
    "/api/company",
    "/api/users",
    "/api/team",
    "/api/permissions",
    "/api/security",
    "/api/integrations",
    "/api/upload",
    "/api/media",
  ];

  // Answered with a plausible success, but nothing leaves the building.
  const DEMO_SILENCED_API = [
    "/api/email/send",
    "/api/email-verification",
    "/api/whatsapp/",
    "/api/notifications/sms",
    "/api/automation/sms",
    "/api/ai/invoice-reminders/send",
    "/api/support/ticket",
  ];

  const publicApi = [
    "/api/auth/login",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/billing/invoices/pdf",
    "/api/login",
    "/api/auth/signup",
    "/api/auth/google",
    "/api/auth/magic",
    "/api/auth/verify",
    "/api/onboarding/signup",
    // The whole admin sign-in flow: password step, authenticator enrolment,
    // OTP verification, sign-out. Each authenticates itself from its own
    // short-lived cookie; none of them has a company context to require.
    "/api/admin/auth/",
    "/api/email-verification",
    "/api/test-db",
    "/api/test-login",
    "/api/analytics",
    "/api/demo/login",
    "/api/demo/slots",
    "/api/demo/book",
    "/api/demo/start",
    "/api/demo/end",
    "/api/cron/",
    "/api/invitations/accept",
    "/api/invitations/preview",
    "/api/public/",
    "/api/dev/",
    // Marketing website chatbot — no auth needed
    "/api/widget-chat",
    "/api/chat/conversations",
    "/api/chat/messages",
    "/api/chat/escalate",
    // Public support ticket form (no login required)
    "/api/support/ticket",
    // Anonymous marketing-site visitor tracking (no auth / company context)
    "/api/track/visit",
    // Cross-domain impersonation handoff — this endpoint *bootstraps* the
    // session on the app domain, so by definition no sb_auth cookie (and no
    // x-company-id) exists yet when it is called. The route itself verifies
    // the signed, 1h-lived JWT and rejects anything without `impersonatedBy`.
    "/api/auth/impersonate-handoff",
    // Payment provider webhooks (Lemon Squeezy / Safepay / Stripe) — these
    // POSTs carry no auth cookie or company header; blocking them here was
    // why successful checkouts never activated (status stayed INACTIVE, no
    // invoices). The route verifies each provider's HMAC signature itself.
    "/api/billing/webhook",
  ];
  const isApi = pathname.startsWith("/api/");
  const isPublic = publicApi.some((p) => pathname.startsWith(p));
  const userRole = headers.get("x-user-role");

  // ── Demo session guardrails ──────────────────────────────────────────────
  // A demo visitor is a real ADMIN inside a throwaway company, so every
  // day-to-day screen must keep working — invoices, payroll, vouchers, reports.
  // What must not work is anything that reaches the outside world or the
  // platform itself. The `demo` claim is signed into the token by
  // createDemoSandbox, so it cannot be set by the client.
  if (decoded?.demo === true) {
    if (DEMO_BLOCKED_API.some((p) => pathname.startsWith(p))) {
      return NextResponse.json(
        { error: "Not available in the demo", demo: true },
        { status: 403 },
      );
    }
    if (req.method !== "GET" && DEMO_READONLY_API.some((p) => pathname.startsWith(p))) {
      return NextResponse.json(
        { error: "Read-only in the demo", demo: true },
        { status: 403 },
      );
    }
    // Outbound messaging is answered with a success the UI can render, but
    // nothing is actually sent — seeded parties carry placeholder addresses
    // and a demo must never mail or text a real person.
    if (DEMO_SILENCED_API.some((p) => pathname.startsWith(p))) {
      return NextResponse.json({
        success: true,
        demo: true,
        message: "Demo mode — message prepared but not sent",
      });
    }
    if (pathname.startsWith("/admin")) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }


  if (isApi && !isPublic && !headers.get("x-company-id")) {
    // 🔥 Allow Admin APIs for Admins without company context
    if (pathname.startsWith("/api/admin/") && userRole === "ADMIN") {
      headers.set("x-company-id", "system"); // Use 'system' context for admin-level requests
    } else {
      return NextResponse.json({ error: "Company context required" }, { status: 400 });
    }
  }

  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  // Nothing on the admin host should ever reach a search index or a referrer
  // log on the way out of it.
  if (onAdminHost || isAdminPath) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.headers.set("Referrer-Policy", "no-referrer");
  }

  // ── Affiliate attribution ────────────────────────────────────────────────
  // An affiliate link is just /whatever?ref=CODE. The visitor almost never
  // signs up on that first page view, so the code is parked in a cookie and
  // read again at signup. First touch wins: an existing cookie is never
  // overwritten, so the affiliate who actually earned the click keeps it.
  const ref = normalizeTrackingCode(req.nextUrl.searchParams.get("ref"));
  if (ref && !req.cookies.get(REF_COOKIE)) {
    res.cookies.set(REF_COOKIE, ref, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REF_COOKIE_MAX_AGE,
    });
  }

  return res;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
    // Catch all non-static paths for forge hostname routing
    "/((?!_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml).*)",
  ],
};
