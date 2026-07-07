/**
 * Discord Notification Configuration & Messaging API
 *
 * GET  /api/notifications/discord   — get Discord config
 * PUT  /api/notifications/discord   — save config { webhookUrl, enabled }
 * POST /api/notifications/discord   — send test/manual message { message, title?, color? }
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import {
  getTeamNotificationConfig,
  saveTeamNotificationConfig,
  sendDiscordNotification,
} from "@/lib/teamNotifications";

// ─── GET — return current Discord config ─────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const config = await getTeamNotificationConfig(companyId);

    return NextResponse.json({
      discord: {
        webhookUrl: config.discord?.webhookUrl || "",
        enabled: config.discord?.enabled ?? false,
        configured: Boolean(config.discord?.webhookUrl),
      },
    });
  } catch (e: any) {
    console.error("[Discord GET]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── PUT — save Discord config ────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { webhookUrl, enabled } = body;

    if (!webhookUrl) return NextResponse.json({ error: "webhookUrl is required" }, { status: 400 });

    // Basic URL validation
    try { new URL(webhookUrl); } catch {
      return NextResponse.json({ error: "Invalid webhookUrl" }, { status: 400 });
    }

    const current = await getTeamNotificationConfig(companyId);
    await saveTeamNotificationConfig(companyId, {
      ...current,
      discord: {
        webhookUrl,
        enabled: enabled ?? current.discord?.enabled ?? true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[Discord PUT]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── POST — send test/manual message ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { message, title, color } = body;

    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

    const config = await getTeamNotificationConfig(companyId);
    if (!config.discord?.webhookUrl) {
      return NextResponse.json(
        { error: "Discord is not configured. Set webhookUrl first." },
        { status: 422 },
      );
    }

    // Accept color as either a hex string ("#4A90D9") or a number (0x4A90D9)
    let discordColor: number = 0x4a90d9;
    if (typeof color === "number") {
      discordColor = color;
    } else if (typeof color === "string") {
      const hex = color.replace("#", "");
      const parsed = parseInt(hex, 16);
      if (!isNaN(parsed)) discordColor = parsed;
    }

    const ok = await sendDiscordNotification(config.discord.webhookUrl, message, {
      title: title || undefined,
      color: discordColor,
    });

    if (!ok) {
      return NextResponse.json({ error: "Failed to deliver Discord message" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[Discord POST]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
