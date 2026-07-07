/**
 * SMS Automation API
 *
 * GET  /api/automation/sms                       — get SMS config (masking key)
 * PUT  /api/automation/sms                       — save config { provider, apiUrl, apiKey, from, authHeader, authScheme }
 * POST /api/automation/sms                       — send single SMS { to, message, type? }
 * POST /api/automation/sms?action=bulk           — bulk SMS { contacts: [{to, name}], template, variables? }
 * GET  /api/automation/sms?action=history        — SMS send history (last 50)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAutomationCompanyId,
  encryptCredentials,
  decryptCredentials,
} from "@/lib/automationHelpers";
import { sendSms } from "@/lib/sms";

// ─── Config helpers ───────────────────────────────────────────────────────────

async function getSmsConfig(companyId: string): Promise<Record<string, any>> {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: "SMS_CONFIG", companyId },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    if (!log?.details) return {};
    const raw = log.details;
    if (raw.includes(":")) return decryptCredentials(raw);
    try { return JSON.parse(raw); } catch { return {}; }
  } catch { return {}; }
}

async function saveSmsConfig(companyId: string, config: Record<string, any>): Promise<void> {
  await prisma.activityLog.create({
    data: {
      action: "SMS_CONFIG",
      companyId,
      details: encryptCredentials(config),
    },
  });
}

function maskApiKey(key: string | undefined): string {
  if (!key || key.length < 8) return "****";
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "history") {
      const logs = await prisma.activityLog.findMany({
        where: { action: "SMS_SENT", companyId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { details: true, createdAt: true },
      });

      const history = logs.map((l) => {
        try {
          return { ...JSON.parse(l.details || "{}"), sentAt: l.createdAt };
        } catch {
          return { raw: l.details, sentAt: l.createdAt };
        }
      });

      return NextResponse.json({ history });
    }

    const config = await getSmsConfig(companyId);
    return NextResponse.json({
      config: {
        provider: config.provider || "",
        apiUrl: config.apiUrl || "",
        apiKey: maskApiKey(config.apiKey),
        from: config.from || "",
        authHeader: config.authHeader || "Authorization",
        authScheme: config.authScheme || "Bearer",
        configured: Boolean(config.apiUrl),
      },
    });
  } catch (e: any) {
    console.error("[SMS GET]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── PUT — save config ────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { provider, apiUrl, apiKey, from, authHeader, authScheme } = body;

    if (!apiUrl) return NextResponse.json({ error: "apiUrl is required" }, { status: 400 });

    // If apiKey is masked (unchanged), keep existing key
    const existing = await getSmsConfig(companyId);
    const finalKey = apiKey && !apiKey.includes("****") ? apiKey : (existing.apiKey || "");

    await saveSmsConfig(companyId, {
      provider: provider || existing.provider || "",
      apiUrl,
      apiKey: finalKey,
      from: from || existing.from || "",
      authHeader: authHeader || existing.authHeader || "Authorization",
      authScheme: authScheme || existing.authScheme || "Bearer",
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[SMS PUT]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── POST — send single or bulk ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "bulk") {
      return handleBulk(req, companyId);
    }

    // Single SMS
    const body = await req.json();
    const { to, message, type } = body;

    if (!to) return NextResponse.json({ error: "to is required" }, { status: 400 });
    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

    const config = await getSmsConfig(companyId);
    const result = await sendSms({ to, message });

    await prisma.activityLog.create({
      data: {
        action: "SMS_SENT",
        companyId,
        details: JSON.stringify({
          to,
          message,
          type: type || "manual",
          status: result.success ? "sent" : "failed",
          provider: result.provider,
          error: result.error || null,
        }),
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "SMS send failed" }, { status: 502 });
    }

    return NextResponse.json({ success: true, provider: result.provider });
  } catch (e: any) {
    console.error("[SMS POST]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── Bulk SMS handler ─────────────────────────────────────────────────────────

async function handleBulk(req: NextRequest, companyId: string) {
  const body = await req.json();
  const { contacts, template, variables } = body;

  if (!contacts?.length) {
    return NextResponse.json({ error: "contacts array is required" }, { status: 400 });
  }
  if (!template) {
    return NextResponse.json({ error: "template is required" }, { status: 400 });
  }

  const results: Array<{ to: string; name: string; status: string; provider?: string; error?: string }> = [];
  let sent = 0;
  let failed = 0;

  for (const contact of contacts as Array<{ to: string; name: string }>) {
    if (!contact.to) {
      results.push({ to: "", name: contact.name || "", status: "failed", error: "Missing phone number" });
      failed++;
      continue;
    }

    // Replace {{name}} and any extra variables
    let message = template.replace(/\{\{name\}\}/g, contact.name || "Customer");
    if (variables && typeof variables === "object") {
      for (const [key, val] of Object.entries(variables)) {
        message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(val));
      }
    }

    const result = await sendSms({ to: contact.to, message });

    await prisma.activityLog.create({
      data: {
        action: "SMS_SENT",
        companyId,
        details: JSON.stringify({
          to: contact.to,
          message,
          type: "bulk",
          status: result.success ? "sent" : "failed",
          provider: result.provider,
          error: result.error || null,
        }),
      },
    }).catch(() => {});

    if (result.success) {
      sent++;
      results.push({ to: contact.to, name: contact.name || "", status: "sent", provider: result.provider });
    } else {
      failed++;
      results.push({ to: contact.to, name: contact.name || "", status: "failed", error: result.error });
    }
  }

  return NextResponse.json({ success: true, sent, failed, results });
}
