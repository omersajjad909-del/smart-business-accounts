/**
 * Email Drip Sequence API
 *
 * GET    /api/automation/drip          — list campaigns for company
 * POST   /api/automation/drip          — create campaign
 * PUT    /api/automation/drip          — update campaign
 * DELETE /api/automation/drip?id=...   — delete campaign
 *
 * POST   /api/automation/drip?action=enroll   — enroll a contact { campaignId, email, name }
 * POST   /api/automation/drip?action=trigger  — internal: send next due emails (cron)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import Anthropic from "@anthropic-ai/sdk";

// ─── auth helper ────────────────────────────────────────────────────────────


// ─── storage helpers (activity log as lightweight KV) ────────────────────────
async function getCampaigns(companyId: string): Promise<any[]> {
  try {
    await ensureDripTable();
    const rows = await prisma.$queryRaw<{ id: string; data: string }[]>`
      SELECT id, data FROM "DripCampaign" WHERE "companyId" = ${companyId} ORDER BY "createdAt" DESC
    `.catch(() => [] as { id: string; data: string }[]);
    return rows.map(r => ({ id: r.id, ...JSON.parse(r.data) }));
  } catch { return []; }
}

async function ensureDripTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DripCampaign" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DripEnrollment" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "campaignId" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "name" TEXT NOT NULL DEFAULT '',
      "stepIndex" INTEGER NOT NULL DEFAULT 0,
      "nextSendAt" TIMESTAMP(3),
      "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" TIMESTAMP(3)
    )
  `).catch(() => {});
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const campaigns = await getCampaigns(companyId);
    return NextResponse.json(campaigns);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "enroll") return handleEnroll(req, companyId);
    if (action === "trigger") return handleTrigger(req, companyId);

    // Create campaign
    await ensureDripTable();
    const body = await req.json();
    const { name, subject, steps } = body;
    // steps: [{ delayDays, subject, bodyHtml?, bodyText?, useAI?, aiPrompt? }]
    if (!name || !steps?.length) {
      return NextResponse.json({ error: "name and steps are required" }, { status: 400 });
    }

    await prisma.$executeRaw`
      INSERT INTO "DripCampaign" ("companyId", "data")
      VALUES (${companyId}, ${JSON.stringify({ name, subject, steps, active: true })})
    `;

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
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await ensureDripTable();
    await prisma.$executeRaw`
      UPDATE "DripCampaign"
      SET "data" = ${JSON.stringify(rest)}, "updatedAt" = CURRENT_TIMESTAMP
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
    await ensureDripTable();
    await prisma.$executeRaw`
      DELETE FROM "DripCampaign" WHERE "id" = ${id} AND "companyId" = ${companyId}
    `;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── Enroll contact ──────────────────────────────────────────────────────────
async function handleEnroll(req: NextRequest, companyId: string) {
  const body = await req.json();
  const { campaignId, email, name } = body;
  if (!campaignId || !email) {
    return NextResponse.json({ error: "campaignId and email required" }, { status: 400 });
  }
  await ensureDripTable();

  // Get campaign steps
  const rows = await prisma.$queryRaw<{ data: string }[]>`
    SELECT data FROM "DripCampaign" WHERE "id" = ${campaignId} AND "companyId" = ${companyId} LIMIT 1
  `.catch(() => [] as { data: string }[]);

  if (!rows[0]) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const campaign = JSON.parse(rows[0].data);
  const firstStep = campaign.steps?.[0];
  const delayDays = firstStep?.delayDays || 0;
  const nextSend = new Date(Date.now() + delayDays * 86400000);

  await prisma.$executeRaw`
    INSERT INTO "DripEnrollment" ("campaignId", "companyId", "email", "name", "stepIndex", "nextSendAt")
    VALUES (${campaignId}, ${companyId}, ${email}, ${name || ""}, ${0}, ${nextSend})
    ON CONFLICT DO NOTHING
  `;

  return NextResponse.json({ success: true });
}

// ─── Trigger due emails (called by cron or manually) ─────────────────────────
async function handleTrigger(_req: NextRequest, companyId: string) {
  await ensureDripTable();
  const now = new Date();

  const due = await prisma.$queryRaw<{
    id: string; campaignId: string; email: string; name: string; stepIndex: number;
  }[]>`
    SELECT e.id, e."campaignId", e.email, e.name, e."stepIndex"
    FROM "DripEnrollment" e
    WHERE e."companyId" = ${companyId}
      AND e."completedAt" IS NULL
      AND e."nextSendAt" <= ${now}
    LIMIT 50
  `.catch(() => [] as { id: string; campaignId: string; email: string; name: string; stepIndex: number; }[]);

  let sent = 0;

  for (const enrollment of due) {
    const campRows = await prisma.$queryRaw<{ data: string }[]>`
      SELECT data FROM "DripCampaign" WHERE "id" = ${enrollment.campaignId} LIMIT 1
    `.catch(() => [] as { data: string }[]);

    if (!campRows[0]) continue;
    const campaign = JSON.parse(campRows[0].data);
    const step = campaign.steps?.[enrollment.stepIndex];
    if (!step) {
      // Mark complete
      await prisma.$executeRaw`
        UPDATE "DripEnrollment" SET "completedAt" = ${now} WHERE "id" = ${enrollment.id}
      `.catch(() => {});
      continue;
    }

    let bodyHtml = step.bodyHtml || "";

    // AI-generated body if configured
    if (step.useAI && step.aiPrompt) {
      try {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const res = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `Write a professional email body for: ${step.aiPrompt}\nRecipient name: ${enrollment.name || "Customer"}\nReturn only the HTML body content.`,
          }],
        });
        const text = res.content.find(c => c.type === "text")?.text || "";
        if (text) bodyHtml = `<p>${text.replace(/\n/g, "<br/>")}</p>`;
      } catch (e) { console.error("AI drip error:", e); }
    }

    // Replace merge tags
    bodyHtml = bodyHtml
      .replace(/\{\{name\}\}/g, enrollment.name || "Customer")
      .replace(/\{\{email\}\}/g, enrollment.email);

    await sendEmail({
      to: enrollment.email,
      subject: (step.subject || campaign.subject || "").replace(/\{\{name\}\}/g, enrollment.name || "Customer"),
      html: bodyHtml,
      companyId,
    });

    sent++;

    // Advance to next step
    const nextIndex = enrollment.stepIndex + 1;
    const nextStep = campaign.steps?.[nextIndex];

    if (nextStep) {
      const nextSend = new Date(Date.now() + (nextStep.delayDays || 1) * 86400000);
      await prisma.$executeRaw`
        UPDATE "DripEnrollment"
        SET "stepIndex" = ${nextIndex}, "nextSendAt" = ${nextSend}
        WHERE "id" = ${enrollment.id}
      `.catch(() => {});
    } else {
      await prisma.$executeRaw`
        UPDATE "DripEnrollment" SET "completedAt" = ${now} WHERE "id" = ${enrollment.id}
      `.catch(() => {});
    }
  }

  return NextResponse.json({ success: true, sent });
}
