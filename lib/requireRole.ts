import { NextResponse } from "next/server";
import { verifyJwt, getTokenFromRequest } from "./auth";

export function requireRole(req: Request, roles: string[]) {
  // 1. Check if we already have it from headers (set by proxy/middleware)
  const roleHeader = req.headers.get("x-user-role");
  if (roleHeader && roles.includes(roleHeader)) {
    return null;
  }

  // 2. Otherwise, verify the token directly (more secure)
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decoded = verifyJwt(token);
  if (!decoded || !roles.includes(decoded.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
