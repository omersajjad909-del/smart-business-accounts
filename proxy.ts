import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

const FORGE_HOSTS = ["finovaforge.com", "www.finovaforge.com"];

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
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://ipapi.co https://www.googletagmanager.com https://static.cloudflareinsights.com https://cloudflareinsights.com https://www.google-analytics.com https://www.google.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(req: NextRequest) {
  // Per-request CSP nonce — server components read this via next/headers.
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // ── Forge hostname routing ──────────────────────────────────────
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (FORGE_HOSTS.includes(host)) {
    const { pathname, search } = req.nextUrl;
    const fwdHeaders = new Headers(req.headers);
    fwdHeaders.set("x-nonce", nonce);
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

  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);

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

  const pathname = req.nextUrl.pathname || "";
  // Require auth for app pages
  const needsAuth =
    (pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/admin")) &&
    !pathname.startsWith("/admin/login") &&
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
  const publicApi = [
    "/api/auth/login",
    "/api/login",
    "/api/auth/signup",
    "/api/auth/google",
    "/api/auth/magic",
    "/api/auth/verify",
    "/api/onboarding/signup",
    "/api/admin/auth/login",
    "/api/email-verification",
    "/api/test-db",
    "/api/test-login",
    "/api/analytics",
    "/api/demo/login",
    "/api/demo/seed",
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
  ];
  const isApi = pathname.startsWith("/api/");
  const isPublic = publicApi.some((p) => pathname.startsWith(p));
  const userRole = headers.get("x-user-role");
  
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
