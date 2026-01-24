import { NextResponse } from "next/server";

export function requireRole(req: Request, roles: string[]) {
  const role = req.headers.get("x-user-role");
  if (!role || !roles.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
