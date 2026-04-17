/**
 * Inbound Webhook Receiver — receives payloads from Zapier/Make/n8n
 *
 * POST /api/automation/webhooks/inbound?token=<secret>
 *
 * The token identifies the company. On receipt, the payload is:
 *  1. Saved to activity log
 *  2. Processed by registered action rules (e.g. "create lead", "send whatsapp")
 */

import { NextRequest, NextResponse } from "next/server";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

async function ensureInboundTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "InboundWebhookToken" (
      "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId" TEXT NOT NULL,
      "token"     TEXT NOT NULL UNIQUE,
      "name"      TEXT NOT NULL DEFAULT 'Default',
      "actions"   TEXT NOT NULL DEFAULT '[]',
      "active"    BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "hitCount"  INTEGER NOT NULL DEFAULT 0
    )
  `).catch(() => {});
}



// ─── GET — list inbound tokens for this company ──────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureInboundTable();
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, name, token, actions, active, "hitCount", "createdAt"
      FROM "InboundWebhookToken"
      WHERE "companyId" = ${companyId}
      ORDER BY "createdAt" DESC
    `.catch(() => []);
    return NextResponse.json(rows.map(r => ({ ...r, actions: JSON.parse(r.actions || "[]") })));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── POST (authenticated) — create new inbound token ─────────────────────────
// ─── POST (unauthenticated with ?token=) — receive payload ───────────────────
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  // Unauthenticated receive path
  if (token) {
    return handleInboundPayload(req, token);
  }

  // Authenticated management path
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureInboundTable();
    const body = await req.json();
    const { name, actions } = body;

    const newToken = crypto.randomBytes(24).toString("hex");
    await prisma.$executeRaw`
      INSERT INTO "InboundWebhookToken" ("companyId", "token", "name", "actions")
      VALUES (${companyId}, ${newToken}, ${name || "Default"}, ${JSON.stringify(actions || [])})
    `;

    return NextResponse.json({ success: true, token: newToken });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await ensureInboundTable();
    await prisma.$executeRaw`
      DELETE FROM "InboundWebhookToken" WHERE "id" = ${id} AND "companyId" = ${companyId}
    `;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── Handle inbound payload ───────────────────────────────────────────────────
async function handleInboundPayload(req: NextRequest, token: string) {
  try {
    await ensureInboundTable();
    const rows = await prisma.$queryRaw<{ id: string; companyId: string; actions: string }[]>`
      SELECT id, "companyId", actions FROM "InboundWebhookToken"
      WHERE token = ${token} AND active = TRUE
      LIMIT 1
    `.catch(() => [] as { id: string; companyId: string; actions: string }[]);

    if (!rows[0]) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { id, companyId, actions: actionsJson } = rows[0];

    let payload: any = {};
    try { payload = await req.json(); } catch { payload = {}; }

    // Log the hit
    await prisma.activityLog.create({
      data: {
        action: "INBOUND_WEBHOOK",
        companyId,
        details: JSON.stringify({ token: token.slice(0, 8) + "...", payload }),
      },
    }).catch(() => {});

    await prisma.$executeRaw`
      UPDATE "InboundWebhookToken" SET "hitCount" = "hitCount" + 1 WHERE "id" = ${id}
    `.catch(() => {});

    // Process actions
    const actions: any[] = JSON.parse(actionsJson || "[]");
    for (const action of actions) {
      await processAction(companyId, action, payload).catch(console.error);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

async function processAction(companyId: string, action: any, payload: any) {
  const type: string = action?.type || "";

  if (type === "create_lead") {
    // Map payload fields to lead fields
    const name = payload[action.nameField || "name"] || payload.name || "Unknown";
    const email = payload[action.emailField || "email"] || payload.email || "";
    const phone = payload[action.phoneField || "phone"] || payload.phone || "";

    await prisma.activityLog.create({
      data: {
        action: "LEAD_CREATED",
        companyId,
        details: JSON.stringify({ name, email, phone, source: "inbound_webhook", payload }),
      },
    });
  }

  if (type === "send_whatsapp") {
    const { sendWhatsApp, formatPhone } = await import("@/lib/whatsapp");
    const phone = payload[action.phoneField || "phone"] || payload.phone;
    if (phone) {
      await sendWhatsApp(companyId, {
        to: formatPhone(String(phone)),
        type: "text",
        text: action.message || `New webhook event received.`,
      });
    }
  }

  if (type === "send_email") {
    const { sendEmail } = await import("@/lib/email");
    const email = payload[action.emailField || "email"] || payload.email;
    if (email) {
      await sendEmail({
        to: email,
        subject: action.subject || "Notification from FinovaOS",
        html: `<p>${action.body || "You have a new notification."}</p>`,
        companyId,
      });
    }
  }
}
