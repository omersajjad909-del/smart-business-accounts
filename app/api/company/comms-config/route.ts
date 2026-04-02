import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import {
  getCompanyCommsConfig,
  maskCompanyCommsConfig,
  saveCompanyCommsConfig,
} from "@/lib/companyCommsConfig";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

function requireAdmin(req: NextRequest) {
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

    if (!requireAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await getCompanyCommsConfig(companyId);
    return NextResponse.json(maskCompanyCommsConfig(config));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load comms config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    if (!requireAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = req.headers.get("x-user-id");
    const body = await req.json();
    const current = await getCompanyCommsConfig(companyId);

    const patch = {
      email: body.email
        ? {
            ...body.email,
            pass:
              body.email.pass && body.email.pass !== "********"
                ? body.email.pass
                : current.email.pass,
          }
        : undefined,
      whatsapp: body.whatsapp
        ? {
            ...body.whatsapp,
            token:
              body.whatsapp.token && body.whatsapp.token !== "********"
                ? body.whatsapp.token
                : current.whatsapp.token,
          }
        : undefined,
    };

    const saved = await saveCompanyCommsConfig(companyId, userId, patch);
    return NextResponse.json(maskCompanyCommsConfig(saved));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save comms config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
