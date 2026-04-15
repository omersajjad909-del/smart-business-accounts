/**
 * Zapier/Make Outbound Webhook Management
 *
 * GET    /api/automation/webhooks          — list webhooks
 * POST   /api/automation/webhooks          — create webhook endpoint
 * PUT    /api/automation/webhooks          — update webhook
 * DELETE /api/automation/webhooks?id=...   — delete webhook
 * POST   /api/automation/webhooks?action=fire&id=... — manually fire a webhook with payload
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

async function getCompanyId(req: NextRequest): Promise<string | null> {
  try {
    const h = req.headers.get("x-company-id");
    if (h) return h;
    const uid = req.headers.get("x-user-id");
    if (uid) {
      const u = await prisma.user.findUnique({ where: { id: uid }, select: { defaultCompanyId: true } });
      if (u?.defaultCompanyId) return u.defaultCompanyId;
    }
    const cookie = req.headers.get("cookie") || "";
    const m = cookie.match(/sb_auth=([^;]+)/);
    if (m) {
      const parts = decodeURIComponent(m[1]).split(".");
      if (parts.length === 3) {
        const p = JSON.parse(Buffer.from(parts[1], "base64url").toString());
        if (p?.companyId) return p.companyId;
      }
    }
    return null;
  } catch { return null; }
}

async function ensureWebhookTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OutboundWebhook" (
      "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId" TEXT NOT NULL,
      "name"      TEXT NOT NULL,
      "url"       TEXT NOT NULL,
      "secret"    TEXT,
      "events"    TEXT NOT NULL DEFAULT '[]',
      "active"    BOOLEAN NOT NULL DEFAULT TRUE,
      "lastFired" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureWebhookTable();
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, name, url, events, active, "lastFired", "createdAt"
      FROM "OutboundWebhook"
      WHERE "companyId" = ${companyId}
      ORDER BY "createdAt" DESC
    `.catch(() => []);
    return NextResponse.json(rows.map(r => ({ ...r, events: JSON.parse(r.events || "[]") })));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "fire") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const body = await req.json();
      return fireWebhook(id, companyId, body);
    }

    await ensureWebhookTable();
    const body = await req.json();
    const { name, url, events, secret } = body;
    if (!name || !url) return NextResponse.json({ error: "name and url required" }, { status: 400 });

    // Validate URL
    try { new URL(url); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

    const hookSecret = secret || crypto.randomBytes(20).toString("hex");

    await prisma.$executeRaw`
      INSERT INTO "OutboundWebhook" ("companyId", "name", "url", "secret", "events")
      VALUES (${companyId}, ${name}, ${url}, ${hookSecret}, ${JSON.stringify(events || [])})
    `;

    return NextResponse.json({ success: true, secret: hookSecret });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { id, name, url, events, active } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await ensureWebhookTable();
    await prisma.$executeRaw`
      UPDATE "OutboundWebhook"
      SET "name" = ${name}, "url" = ${url},
          "events" = ${JSON.stringify(events || [])}, "active" = ${active}
      WHERE "id" = ${id} AND "companyId" = ${companyId}
    `;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await ensureWebhookTable();
    await prisma.$executeRaw`
      DELETE FROM "OutboundWebhook" WHERE "id" = ${id} AND "companyId" = ${companyId}
    `;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── Fire webhook ─────────────────────────────────────────────────────────────
async function fireWebhook(id: string, companyId: string, payload: any) {
  await ensureWebhookTable();
  const rows = await prisma.$queryRaw<{ url: string; secret: string }[]>`
    SELECT url, secret FROM "OutboundWebhook"
    WHERE "id" = ${id} AND "companyId" = ${companyId} AND "active" = TRUE
    LIMIT 1
  `.catch(() => [] as { url: string; secret: string }[]);

  if (!rows[0]) return NextResponse.json({ error: "Webhook not found or inactive" }, { status: 404 });

  const { url, secret } = rows[0];
  const body = JSON.stringify({ ...payload, _company: companyId, _timestamp: Date.now() });

  // HMAC-SHA256 signature
  const sig = crypto.createHmac("sha256", secret || "").update(body).digest("hex");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-FinovaOS-Signature": `sha256=${sig}`,
        "X-FinovaOS-Event": payload?.event || "manual",
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    await prisma.$executeRaw`
      UPDATE "OutboundWebhook" SET "lastFired" = CURRENT_TIMESTAMP WHERE "id" = ${id}
    `.catch(() => {});

    return NextResponse.json({ success: true, status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: `Delivery failed: ${e?.message}` }, { status: 502 });
  }
}

// ─── Exported helper: fire event for a company ───────────────────────────────
export async function fireWebhookEvent(companyId: string, event: string, data: any) {
  try {
    await ensureWebhookTable();
    const hooks = await prisma.$queryRaw<{ id: string; url: string; secret: string; events: string }[]>`
      SELECT id, url, secret, events FROM "OutboundWebhook"
      WHERE "companyId" = ${companyId} AND "active" = TRUE
    `.catch(() => [] as { id: string; url: string; secret: string; events: string }[]);

    for (const hook of hooks) {
      const evts: string[] = JSON.parse(hook.events || "[]");
      if (evts.length > 0 && !evts.includes(event) && !evts.includes("*")) continue;

      const body = JSON.stringify({ event, data, _company: companyId, _timestamp: Date.now() });
      const sig = crypto.createHmac("sha256", hook.secret || "").update(body).digest("hex");

      fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-FinovaOS-Signature": `sha256=${sig}`,
          "X-FinovaOS-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10000),
      }).then(() => {
        prisma.$executeRaw`
          UPDATE "OutboundWebhook" SET "lastFired" = CURRENT_TIMESTAMP WHERE "id" = ${hook.id}
        `.catch(() => {});
      }).catch(console.error);
    }
  } catch (e) {
    console.error("fireWebhookEvent error:", e);
  }
}
