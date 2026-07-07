/**
 * Global SMS API — Twilio + AWS SNS + Generic, region-aware
 *
 * GET  /api/notifications/sms                          — get SMS config + provider status
 * PUT  /api/notifications/sms                          — save config { provider, twilioSid?, twilioToken?, twilioFrom?, snsRegion?, genericUrl?, genericKey?, from? }
 * POST /api/notifications/sms                          — send single SMS (region-aware)
 *      Body: { to, message, type?, useRegionRouting?: boolean }
 *
 * POST /api/notifications/sms?action=bulk              — bulk global SMS
 *      Body: { contacts: [{to, name, timezone?}], template, variables?, scheduleAt? }
 *
 * POST /api/notifications/sms?action=schedule          — schedule SMS for customer's local time
 *      Body: { to, message, timezone, sendAtHour: number (e.g. 9 for 9 AM) }
 *
 * GET  /api/notifications/sms?action=history           — last 100 sends with region + provider
 * GET  /api/notifications/sms?action=stats             — { sent, byRegion, byProvider, deliveryRate }
 * GET  /api/notifications/sms?action=providers         — list available providers with configured status
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAutomationCompanyId, encryptCredentials, decryptCredentials } from "@/lib/automationHelpers";
import { prisma } from "@/lib/prisma";
import {
  sendSmsWithRegionRouting,
  sendSmsTwilio,
  detectRegion,
  getBestSmsProvider,
  normalizePhone,
} from "@/lib/sms";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Interpolate {{name}} / {{variable}} placeholders in a template string. */
function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

/** Load latest SMS_GLOBAL_CONFIG log for a company. */
async function loadSmsConfig(companyId: string): Promise<Record<string, any>> {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { companyId, action: "SMS_GLOBAL_CONFIG" },
      orderBy: { createdAt: "desc" },
    });
    if (!log?.details) return {};
    const parsed = JSON.parse(log.details);
    if (parsed.encrypted) return decryptCredentials(parsed.encrypted);
    return parsed;
  } catch (e) {
    console.error("[SMS GET] Config load failed:", e);
    return {};
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "history") return handleGetHistory(companyId);
    if (action === "stats") return handleGetStats(companyId);
    if (action === "providers") return handleGetProviders();

    // Default: config + provider status
    const config = await loadSmsConfig(companyId);

    return NextResponse.json({
      provider: config.provider || "generic",
      from: config.from || "",
      twilioConfigured: Boolean(config.twilioSid && config.twilioToken && config.twilioFrom),
      snsConfigured: Boolean(config.snsRegion),
      genericConfigured: Boolean(config.genericUrl),
      envTwilioConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID),
      envSnsConfigured: Boolean(process.env.AWS_ACCESS_KEY_ID),
      envGenericConfigured: Boolean(process.env.SMS_API_URL),
    });
  } catch (e: any) {
    console.error("[SMS GET]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

async function handleGetHistory(companyId: string) {
  const logs = await prisma.activityLog.findMany({
    where: { companyId, action: "SMS_SENT_GLOBAL" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const history = logs.map((log) => {
    let details: Record<string, any> = {};
    try { details = JSON.parse(log.details || "{}"); } catch { /* ignore */ }
    return {
      id: log.id,
      to: details.to,
      region: details.region,
      provider: details.provider,
      type: details.type,
      success: details.success,
      messageId: details.messageId,
      error: details.error,
      sentAt: log.createdAt,
    };
  });

  return NextResponse.json({ history });
}

async function handleGetStats(companyId: string) {
  const logs = await prisma.activityLog.findMany({
    where: { companyId, action: "SMS_SENT_GLOBAL" },
    orderBy: { createdAt: "desc" },
  });

  const byRegion: Record<string, number> = { us: 0, eu: 0, asia: 0, other: 0 };
  const byProvider: Record<string, number> = {};
  let successCount = 0;

  for (const log of logs) {
    let d: Record<string, any> = {};
    try { d = JSON.parse(log.details || "{}"); } catch { /* ignore */ }

    const region = d.region as string;
    if (region && region in byRegion) byRegion[region]++;

    const provider = d.provider as string;
    if (provider) byProvider[provider] = (byProvider[provider] || 0) + 1;

    if (d.success) successCount++;
  }

  return NextResponse.json({
    sent: logs.length,
    byRegion,
    byProvider,
    deliveryRate: logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0,
  });
}

function handleGetProviders() {
  const providers = [
    {
      id: "twilio",
      name: "Twilio",
      regions: ["us", "eu", "other"],
      configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
      envVars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    },
    {
      id: "sns",
      name: "AWS SNS",
      regions: ["asia"],
      configured: Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_SNS_SENDER_ID"],
    },
    {
      id: "generic",
      name: "Generic HTTP SMS",
      regions: ["all"],
      configured: Boolean(process.env.SMS_API_URL),
      envVars: ["SMS_API_URL", "SMS_API_KEY", "SMS_FROM"],
    },
  ];

  return NextResponse.json({ providers });
}

// ─── PUT — save config ────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      provider,
      twilioSid,
      twilioToken,
      twilioFrom,
      snsRegion,
      genericUrl,
      genericKey,
      from,
    } = body;

    const validProviders = ["twilio", "sns", "generic"];
    if (provider && !validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `provider must be one of: ${validProviders.join(", ")}` },
        { status: 400 }
      );
    }

    const configPayload: Record<string, any> = {
      provider: provider || "generic",
      from: from || "",
      ...(twilioSid && { twilioSid }),
      ...(twilioToken && { twilioToken }),
      ...(twilioFrom && { twilioFrom }),
      ...(snsRegion && { snsRegion }),
      ...(genericUrl && { genericUrl }),
      ...(genericKey && { genericKey }),
    };

    const encrypted = encryptCredentials(configPayload);

    await prisma.activityLog.create({
      data: {
        action: "SMS_GLOBAL_CONFIG",
        companyId,
        details: JSON.stringify({ encrypted }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[SMS PUT]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── POST — send / bulk / schedule ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "bulk") return handleBulk(req, companyId);
    if (action === "schedule") return handleSchedule(req, companyId);

    // Default: single SMS
    return handleSendSingle(req, companyId);
  } catch (e: any) {
    console.error("[SMS POST]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── Single SMS ───────────────────────────────────────────────────────────────

async function handleSendSingle(req: NextRequest, companyId: string) {
  const body = await req.json();
  const { to, message, type, useRegionRouting } = body;

  if (!to) return NextResponse.json({ error: "to is required" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const phone = normalizePhone(to);
  if (!phone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

  if (useRegionRouting === false) {
    // Force Twilio directly, no region logic
    const result = await sendSmsTwilio({ to: phone, message });
    return NextResponse.json(result);
  }

  const result = await sendSmsWithRegionRouting({
    to: phone,
    message,
    type: type || "single",
    companyId,
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result);
}

// ─── Bulk SMS ─────────────────────────────────────────────────────────────────

async function handleBulk(req: NextRequest, companyId: string) {
  const body = await req.json();
  const { contacts, template, variables, scheduleAt } = body;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "contacts array is required and must not be empty" }, { status: 400 });
  }
  if (!template) {
    return NextResponse.json({ error: "template is required" }, { status: 400 });
  }

  // If scheduleAt is provided, store the job in ActivityLog for later processing
  if (scheduleAt) {
    const scheduledTime = new Date(scheduleAt);
    if (isNaN(scheduledTime.getTime())) {
      return NextResponse.json({ error: "scheduleAt must be a valid ISO date string" }, { status: 400 });
    }

    await prisma.activityLog.create({
      data: {
        action: "SMS_BULK_SCHEDULED",
        companyId,
        details: JSON.stringify({
          contacts,
          template,
          variables: variables || {},
          scheduleAt: scheduledTime.toISOString(),
          status: "pending",
        }),
      },
    });

    return NextResponse.json({
      success: true,
      scheduled: true,
      scheduleAt: scheduledTime.toISOString(),
      count: contacts.length,
    });
  }

  // Send immediately
  const results: Array<{ to: string; success: boolean; provider: string; error?: string }> = [];

  for (const contact of contacts) {
    const phone = normalizePhone(contact.to);
    if (!phone) {
      results.push({ to: contact.to, success: false, provider: "none", error: "Invalid phone" });
      continue;
    }

    const personalVars = { name: contact.name || "", ...variables };
    const personalizedMessage = interpolate(template, personalVars);

    const result = await sendSmsWithRegionRouting({
      to: phone,
      message: personalizedMessage,
      type: "bulk",
      companyId,
    });

    results.push({ to: phone, success: result.success, provider: result.provider, error: result.error });
  }

  const sentCount = results.filter((r) => r.success).length;

  return NextResponse.json({
    success: true,
    total: contacts.length,
    sent: sentCount,
    failed: contacts.length - sentCount,
    results,
  });
}

// ─── Schedule SMS for local time ──────────────────────────────────────────────

async function handleSchedule(req: NextRequest, companyId: string) {
  const body = await req.json();
  const { to, message, timezone, sendAtHour } = body;

  if (!to) return NextResponse.json({ error: "to is required" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });
  if (!timezone) return NextResponse.json({ error: "timezone is required" }, { status: 400 });
  if (typeof sendAtHour !== "number" || sendAtHour < 0 || sendAtHour > 23) {
    return NextResponse.json({ error: "sendAtHour must be a number between 0 and 23" }, { status: 400 });
  }

  const phone = normalizePhone(to);
  if (!phone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

  // Try to resolve the next occurrence using lib/timezone if available
  let sendAt: Date | null = null;

  try {
    const timezoneLib = await import("@/lib/timezone");
    if (typeof timezoneLib.getNextOccurrenceAt === "function") {
      sendAt = timezoneLib.getNextOccurrenceAt({ timezone, hour: sendAtHour });
    }
  } catch {
    // lib/timezone not available — compute manually
  }

  if (!sendAt) {
    // Manual fallback: find the next wall-clock occurrence at sendAtHour in the given timezone
    try {
      const now = new Date();
      // Use Intl to find UTC offset for the timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
        timeZoneName: "longOffset",
      });
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value || "";
      const offsetMatch = offsetPart.match(/GMT([+-]\d{1,2}):?(\d{2})?/);
      const offsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;
      const offsetMins = offsetMatch?.[2] ? parseInt(offsetMatch[2], 10) : 0;
      const totalOffsetMins = offsetHours * 60 + (offsetHours < 0 ? -offsetMins : offsetMins);

      // Current local hour in target timezone
      const localNow = new Date(now.getTime() + totalOffsetMins * 60 * 1000);
      const localHour = localNow.getUTCHours();

      // Build target time today in local, convert to UTC
      const targetLocal = new Date(localNow);
      targetLocal.setUTCHours(sendAtHour, 0, 0, 0);

      if (localHour >= sendAtHour) {
        // Already past today — schedule for tomorrow
        targetLocal.setUTCDate(targetLocal.getUTCDate() + 1);
      }

      sendAt = new Date(targetLocal.getTime() - totalOffsetMins * 60 * 1000);
    } catch {
      // Final fallback: send 1 hour from now
      sendAt = new Date(Date.now() + 60 * 60 * 1000);
    }
  }

  await prisma.activityLog.create({
    data: {
      action: "SMS_SCHEDULED",
      companyId,
      details: JSON.stringify({
        to: phone,
        message,
        timezone,
        sendAtHour,
        sendAt: sendAt.toISOString(),
        region: detectRegion(phone),
        provider: getBestSmsProvider(phone),
        status: "pending",
      }),
    },
  });

  return NextResponse.json({
    success: true,
    scheduled: true,
    to: phone,
    timezone,
    sendAtHour,
    sendAt: sendAt.toISOString(),
    region: detectRegion(phone),
    provider: getBestSmsProvider(phone),
  });
}
