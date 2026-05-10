import { NextRequest, NextResponse } from "next/server";

const FORGE_HOSTS = ["finovaforge.com", "www.finovaforge.com"];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0]; // strip port in dev

  if (FORGE_HOSTS.includes(hostname)) {
    const { pathname, search } = request.nextUrl;

    // Already inside /forge — let through
    if (pathname.startsWith("/forge") || pathname.startsWith("/_next") || pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // Route map: finovaforge.com/X → /forge/X (or home for root)
    const target = pathname === "/" ? "/forge/home" : `/forge${pathname}`;
    return NextResponse.rewrite(new URL(target + search, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml).*)",
  ],
};
