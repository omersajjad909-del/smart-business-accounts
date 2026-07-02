import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

const FORGE_HOSTS = ["finovaforge.com", "www.finovaforge.com"];

export function proxy(req: NextRequest) {
  // ── Forge hostname routing ──────────────────────────────────────
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (FORGE_HOSTS.includes(host)) {
    const { pathname, search } = req.nextUrl;
    if (!pathname.startsWith("/forge") && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
      const target = pathname === "/" ? "/forge/home" : `/forge${pathname}`;
      return NextResponse.rewrite(new URL(target + search, req.url));
    }
    return NextResponse.next();
  }
  // ───────────────────────────────────────────────────────────────

  const headers = new Headers(req.headers);

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

  return NextResponse.next({ request: { headers } });
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
