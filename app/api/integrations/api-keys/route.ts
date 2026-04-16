import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { generateApiKey, listCompanyApiKeys } from "@/lib/apiKeys";

function getSessionContext(req: NextRequest) {
  const headerUserId = String(req.headers.get("x-user-id") || "").trim();
  const headerCompanyId = String(req.headers.get("x-company-id") || "").trim();
  if (headerUserId && headerCompanyId) {
    return { userId: headerUserId, companyId: headerCompanyId };
  }

  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  const userId = String(payload?.userId || "").trim();
  const companyId = String(payload?.companyId || "").trim();
  if (!userId || !companyId) return null;
  return { userId, companyId };
}

function normalizeModuleId(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/-/g, "_");
}

async function assertApiAccessEnabled(companyId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true, activeModules: true },
  });

  if (!company) {
    return { ok: false, message: "Company not found" };
  }

  const planCode = String(company.plan || "STARTER").toUpperCase();
  if (planCode !== "CUSTOM") {
    return { ok: true };
  }

  const active = new Set(
    String(company.activeModules || "")
      .split(",")
      .map((item) => normalizeModuleId(item))
      .filter(Boolean)
  );

  if (!active.has("api_access")) {
    return { ok: false, message: "API Access module is not active in your custom plan" };
  }

  return { ok: true };
}

export async function GET(req: NextRequest) {
  const session = getSessionContext(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gate = await assertApiAccessEnabled(session.companyId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.message }, { status: 403 });
    }
    const keys = await listCompanyApiKeys(session.companyId);
    return NextResponse.json({ keys });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load API keys" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionContext(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gate = await assertApiAccessEnabled(session.companyId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.message }, { status: 403 });
    }
    const body = await req.json();
    const action = String(body?.action || "").toUpperCase();

    if (action === "CREATE") {
      const name = String(body?.name || "").trim() || "API Key";
      const keyId = randomUUID();
      const generated = generateApiKey();

      await prisma.activityLog.create({
        data: {
          action: "API_KEY_CREATED",
          companyId: session.companyId,
          userId: session.userId,
          details: JSON.stringify({
            keyId,
            name,
            keyHash: generated.keyHash,
            keyPreview: generated.keyPreview,
            last4: generated.last4,
            createdBy: session.userId,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        key: {
          id: keyId,
          name,
          rawKey: generated.rawKey,
          keyPreview: generated.keyPreview,
          createdAt: new Date().toISOString(),
        },
      });
    }

    if (action === "REVOKE") {
      const keyId = String(body?.keyId || "").trim();
      if (!keyId) {
        return NextResponse.json({ error: "keyId is required" }, { status: 400 });
      }

      const keys = await listCompanyApiKeys(session.companyId);
      const target = keys.find((key) => key.id === keyId);
      if (!target) {
        return NextResponse.json({ error: "API key not found" }, { status: 404 });
      }
      if (target.status === "revoked") {
        return NextResponse.json({ success: true });
      }

      await prisma.activityLog.create({
        data: {
          action: "API_KEY_REVOKED",
          companyId: session.companyId,
          userId: session.userId,
          details: JSON.stringify({
            keyId,
            revokedBy: session.userId,
          }),
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update API keys" }, { status: 500 });
  }
}
