/**
 * Team Notification Helpers — Slack & Discord
 *
 * Config is stored unencrypted in ActivityLog (action = "TEAM_NOTIFY_CONFIG")
 * as a plain JSON string (webhook URLs are not secret credentials).
 */

import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface SlackOptions {
  title?: string;
  color?: string;
  fields?: SlackField[];
}

export interface DiscordOptions {
  title?: string;
  color?: number;
  fields?: DiscordField[];
}

export interface TeamNotifyConfig {
  slack?: { webhookUrl: string; channel?: string; enabled: boolean };
  discord?: { webhookUrl: string; enabled: boolean };
  rules?: Array<{ event: string; channels: string[]; enabled: boolean }>;
}

// ─── Config store / retrieve ──────────────────────────────────────────────────

export async function getTeamNotificationConfig(
  companyId: string,
): Promise<TeamNotifyConfig> {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: "TEAM_NOTIFY_CONFIG", companyId },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    if (!log?.details) return {};
    return JSON.parse(log.details) as TeamNotifyConfig;
  } catch {
    return {};
  }
}

export async function saveTeamNotificationConfig(
  companyId: string,
  config: object,
): Promise<void> {
  await prisma.activityLog.create({
    data: {
      action: "TEAM_NOTIFY_CONFIG",
      companyId,
      details: JSON.stringify(config),
    },
  });
}

// ─── Slack ────────────────────────────────────────────────────────────────────

export async function sendSlackNotification(
  webhookUrl: string,
  message: string,
  options: SlackOptions = {},
): Promise<boolean> {
  try {
    const { title, color = "#4A90D9", fields } = options;

    const attachment: Record<string, any> = {
      color,
      text: message,
      ts: Math.floor(Date.now() / 1000),
    };
    if (title) attachment.title = title;
    if (fields?.length) {
      attachment.fields = fields.map((f) => ({
        title: f.title,
        value: f.value,
        short: f.short ?? false,
      }));
    }

    const payload = { attachments: [attachment] };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Slack] Send failed:", res.status, text);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[Slack] Error:", e);
    return false;
  }
}

// ─── Discord ──────────────────────────────────────────────────────────────────

export async function sendDiscordNotification(
  webhookUrl: string,
  message: string,
  options: DiscordOptions = {},
): Promise<boolean> {
  try {
    const { title, color = 0x4a90d9, fields } = options;

    const embed: Record<string, any> = {
      description: message,
      color,
      timestamp: new Date().toISOString(),
    };
    if (title) embed.title = title;
    if (fields?.length) {
      embed.fields = fields.map((f) => ({
        name: f.name,
        value: f.value,
        inline: f.inline ?? false,
      }));
    }

    const payload = { embeds: [embed] };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Discord] Send failed:", res.status, text);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[Discord] Error:", e);
    return false;
  }
}

// ─── Fire team notification (event-driven) ────────────────────────────────────

export async function fireTeamNotification(
  companyId: string,
  event: string,
  data: {
    title: string;
    message: string;
    color?: string;
    fields?: Array<{ title?: string; name?: string; value: string; short?: boolean; inline?: boolean }>;
  },
): Promise<void> {
  try {
    const config = await getTeamNotificationConfig(companyId);

    // Determine which channels to notify for this event
    const activeChannels = new Set<string>();

    if (config.rules?.length) {
      for (const rule of config.rules) {
        if (!rule.enabled) continue;
        if (rule.event === event || rule.event === "*") {
          for (const ch of rule.channels) activeChannels.add(ch);
        }
      }
    } else {
      // No rules configured — send to all enabled channels
      if (config.slack?.enabled) activeChannels.add("slack");
      if (config.discord?.enabled) activeChannels.add("discord");
    }

    const slackFields: SlackField[] | undefined = data.fields?.map((f) => ({
      title: f.title || f.name || "",
      value: f.value,
      short: f.short ?? f.inline ?? false,
    }));

    const discordFields: DiscordField[] | undefined = data.fields?.map((f) => ({
      name: f.name || f.title || "",
      value: f.value,
      inline: f.inline ?? f.short ?? false,
    }));

    const promises: Promise<boolean>[] = [];

    if (activeChannels.has("slack") && config.slack?.webhookUrl && config.slack.enabled) {
      promises.push(
        sendSlackNotification(config.slack.webhookUrl, data.message, {
          title: data.title,
          color: data.color || "#4A90D9",
          fields: slackFields,
        }),
      );
    }

    if (activeChannels.has("discord") && config.discord?.webhookUrl && config.discord.enabled) {
      // Parse hex color string to number (e.g. "#4A90D9" → 0x4A90D9)
      let discordColor = 0x4a90d9;
      if (data.color) {
        const hex = data.color.replace("#", "");
        const parsed = parseInt(hex, 16);
        if (!isNaN(parsed)) discordColor = parsed;
      }
      promises.push(
        sendDiscordNotification(config.discord.webhookUrl, data.message, {
          title: data.title,
          color: discordColor,
          fields: discordFields,
        }),
      );
    }

    await Promise.allSettled(promises);
  } catch (e) {
    console.error("[fireTeamNotification]", e);
  }
}
