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

/**
 * A demo visitor is a real ADMIN inside a throwaway company, so this endpoint
 * answers them like anyone else. The `demo` claim is signed into the token by
 * createDemoSandbox and cannot be set by the client — unlike x-user-role above,
 * which is why the role header is not consulted here.
 */
function isDemoSession(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  return (payload as { demo?: boolean } | null)?.demo === true;
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

    const body = await req.json();
    // Business Features is the one part of this screen a demo may write — see
    // DEMO_WRITABLE_API in proxy.ts. Everything else is dropped rather than
    // rejected, so the sandbox never becomes somewhere to park an FBR bearer
    // token or rewrite the company identity a later visitor would inherit.
    const patch = isDemoSession(req)
      ? { features: (body || {}).features || {} }
      : body;
    const userId = req.headers.get("x-user-id");
    const settings = await saveCompanyAdminControlSettings(companyId, userId, patch || {});
    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
