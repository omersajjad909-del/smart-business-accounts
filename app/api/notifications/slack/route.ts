/**
 * Slack Notification Configuration & Messaging API
 *
 * GET  /api/notifications/slack                          — get Slack config
 * PUT  /api/notifications/slack                          — save config { webhookUrl, channel, enabled }
 * POST /api/notifications/slack                          — send test/manual message { message, title?, color?, fields? }
 * POST /api/notifications/slack?action=configure_rules  — save notification rules [{ event, channels, enabled }]
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import {
  getTeamNotificationConfig,
  saveTeamNotificationConfig,
  sendSlackNotification,
  type SlackField,
} from "@/lib/teamNotifications";

// ─── GET — return current Slack config ───────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const config = await getTeamNotificationConfig(companyId);

    return NextResponse.json({
      slack: {
        webhookUrl: config.slack?.webhookUrl || "",
        channel: config.slack?.channel || "",
        enabled: config.slack?.enabled ?? false,
        configured: Boolean(config.slack?.webhookUrl),
      },
      rules: config.rules || [],
    });
  } catch (e: any) {
    console.error("[Slack GET]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── PUT — save Slack config ──────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { webhookUrl, channel, enabled } = body;

    if (!webhookUrl) return NextResponse.json({ error: "webhookUrl is required" }, { status: 400 });

    // Basic URL validation
    try { new URL(webhookUrl); } catch {
      return NextResponse.json({ error: "Invalid webhookUrl" }, { status: 400 });
    }

    const current = await getTeamNotificationConfig(companyId);
    await saveTeamNotificationConfig(companyId, {
      ...current,
      slack: {
        webhookUrl,
        channel: channel || current.slack?.channel || "",
        enabled: enabled ?? current.slack?.enabled ?? true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[Slack PUT]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── POST — send message or configure rules ───────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "configure_rules") {
      return handleConfigureRules(req, companyId);
    }

    // Send message
    const body = await req.json();
    const { message, title, color, fields } = body;

    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

    const config = await getTeamNotificationConfig(companyId);
    if (!config.slack?.webhookUrl) {
      return NextResponse.json({ error: "Slack is not configured. Set webhookUrl first." }, { status: 422 });
    }

    const slackFields: SlackField[] | undefined = Array.isArray(fields)
      ? fields.map((f: any) => ({
          title: f.title || f.name || "",
          value: String(f.value || ""),
          short: f.short ?? false,
        }))
      : undefined;

    const ok = await sendSlackNotification(config.slack.webhookUrl, message, {
      title: title || undefined,
      color: color || "#4A90D9",
      fields: slackFields,
    });

    if (!ok) {
      return NextResponse.json({ error: "Failed to deliver Slack message" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[Slack POST]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── Configure notification rules ─────────────────────────────────────────────

async function handleConfigureRules(req: NextRequest, companyId: string) {
  const body = await req.json();
  const { rules } = body;

  if (!Array.isArray(rules)) {
    return NextResponse.json({ error: "rules must be an array" }, { status: 400 });
  }

  // Validate rule shape
  for (const rule of rules) {
    if (!rule.event || typeof rule.event !== "string") {
      return NextResponse.json({ error: "Each rule must have an event string" }, { status: 400 });
    }
    if (!Array.isArray(rule.channels)) {
      return NextResponse.json({ error: "Each rule must have a channels array" }, { status: 400 });
    }
  }

  const current = await getTeamNotificationConfig(companyId);
  await saveTeamNotificationConfig(companyId, {
    ...current,
    rules: rules.map((r: any) => ({
      event: String(r.event),
      channels: (r.channels as string[]).map(String),
      enabled: r.enabled ?? true,
    })),
  });

  return NextResponse.json({ success: true });
}
