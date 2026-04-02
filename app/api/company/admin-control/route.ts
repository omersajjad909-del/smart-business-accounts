import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import {
  getCompanyAdminControlSettings,
  saveCompanyAdminControlSettings,
} from "@/lib/companyAdminControl";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const headerRole = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (headerRole === "ADMIN") return true;
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  return String(payload?.role || "").toUpperCase() === "ADMIN";
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const settings = await getCompanyAdminControlSettings(companyId);
    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const patch = await req.json();
    const userId = req.headers.get("x-user-id");
    const settings = await saveCompanyAdminControlSettings(companyId, userId, patch || {});
    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
