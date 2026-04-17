/**
 * Social Media Lead Capture + CRM API
 *
 * GET    /api/automation/leads          — list leads
 * POST   /api/automation/leads          — create lead
 * PUT    /api/automation/leads          — update lead
 * DELETE /api/automation/leads?id=...   — delete lead
 * GET    /api/automation/leads?action=facebook_verify  — Facebook webhook verify
 */
import { NextRequest, NextResponse } from "next/server";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import { prisma } from "@/lib/prisma";



async function ensureLeadsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CRMLead" (
      "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId" TEXT NOT NULL,
      "name"      TEXT NOT NULL DEFAULT '',
      "email"     TEXT NOT NULL DEFAULT '',
      "phone"     TEXT NOT NULL DEFAULT '',
      "source"    TEXT NOT NULL DEFAULT 'manual',
      "status"    TEXT NOT NULL DEFAULT 'new',
      "notes"     TEXT NOT NULL DEFAULT '',
      "tags"      TEXT NOT NULL DEFAULT '[]',
      "metadata"  TEXT NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    // Facebook Lead Ads webhook verification
    const { searchParams } = new URL(req.url);
    if (searchParams.get("hub.mode") === "subscribe") {
      const token = searchParams.get("hub.verify_token");
      const challenge = searchParams.get("hub.challenge");
      const expected = process.env.FB_LEAD_WEBHOOK_VERIFY_TOKEN || "finovaos_leads";
      if (token === expected) return new NextResponse(challenge, { status: 200 });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureLeadsTable();

    const status = searchParams.get("status");
    const source = searchParams.get("source");

    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "CRMLead"
      WHERE "companyId" = ${companyId}
        AND (${status}::text IS NULL OR "status" = ${status})
        AND (${source}::text IS NULL OR "source" = ${source})
      ORDER BY "createdAt" DESC
      LIMIT 500
    `.catch(() => []);

    return NextResponse.json(
      rows.map(r => ({ ...r, tags: JSON.parse(r.tags || "[]"), metadata: JSON.parse(r.metadata || "{}") }))
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureLeadsTable();

    const body = await req.json();
    const { name = "", email = "", phone = "", source = "manual", notes = "", tags = [], metadata = {} } = body;

    if (!name && !email && !phone) {
      return NextResponse.json({ error: "At least one of name, email, or phone is required" }, { status: 400 });
    }

    await prisma.$executeRaw`
      INSERT INTO "CRMLead" ("companyId", "name", "email", "phone", "source", "notes", "tags", "metadata")
      VALUES (${companyId}, ${name}, ${email}, ${phone}, ${source}, ${notes}, ${JSON.stringify(tags)}, ${JSON.stringify(metadata)})
    `;

    // Fire webhook event (non-blocking)
    import("@/app/api/automation/webhooks/route").then(({ fireWebhookEvent }) => {
      fireWebhookEvent(companyId, "lead.created", { name, email, phone, source });
    }).catch(() => {});

    // Auto-WhatsApp if phone present and configured
    if (phone) {
      import("@/lib/whatsapp").then(({ sendWhatsApp, formatPhone }) => {
        sendWhatsApp(companyId, {
          to: formatPhone(phone),
          type: "text",
          text: `Hi ${name || "there"}, thank you for your interest! We will get back to you shortly.`,
        }).catch(() => {});
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureLeadsTable();
    const body = await req.json();
    const { id, status, notes, tags } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.$executeRaw`
      UPDATE "CRMLead"
      SET "status"    = COALESCE(${status ?? null}, "status"),
          "notes"     = COALESCE(${notes  ?? null}, "notes"),
          "tags"      = COALESCE(${tags ? JSON.stringify(tags) : null}, "tags"),
          "updatedAt" = CURRENT_TIMESTAMP
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
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await ensureLeadsTable();
    await prisma.$executeRaw`DELETE FROM "CRMLead" WHERE "id" = ${id} AND "companyId" = ${companyId}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
