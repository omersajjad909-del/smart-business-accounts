import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);

  const hasUserId = headers.get("x-user-id");
  const hasUserRole = headers.get("x-user-role");
  const hasCompanyId = headers.get("x-company-id");

  if (!hasUserId || !hasUserRole || !hasCompanyId) {
    const userCookie = req.cookies.get("user");
    if (userCookie?.value) {
      try {
        const parsed = JSON.parse(userCookie.value);
        const user = parsed?.user ?? parsed ?? {};
        if (!hasUserId && user.id) headers.set("x-user-id", String(user.id));
        if (!hasUserRole && user.role) headers.set("x-user-role", String(user.role).toUpperCase());
        const companyId =
          user.companyId ||
          user.defaultCompanyId ||
          (Array.isArray(user.companies) && user.companies.find((c: any) => c?.isDefault)?.id) ||
          null;
        if (!hasCompanyId && companyId) headers.set("x-company-id", String(companyId));
      } catch {}
    }
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/:path*"],
};

