/**
 * The mailer that cold outreach — and only cold outreach — goes through.
 *
 * This is deliberately NOT `lib/email.ts`. That module sends OTPs, invoices and
 * billing receipts from finovaos.app via Resend. Two reasons those two paths
 * must never be the same one:
 *
 *   1. Resend's terms do not permit unsolicited outreach. One complaint and the
 *      account that carries your login emails is gone.
 *   2. Reputation is per-domain. A spam complaint against a cold campaign sent
 *      from finovaos.app lands your password-reset mail in spam too, and takes
 *      weeks to undo.
 *
 * So this module talks to its own SMTP provider, on its own domain, and refuses
 * to send at all rather than quietly falling back to the transactional path.
 */

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export type OutreachDelivery = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type OutreachTransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

/** Domains whose reputation must not be spent on cold email. */
function protectedDomains(): string[] {
  const primary = (process.env.RESEND_FROM_DOMAIN || "finovaos.app").toLowerCase();
  const smtpFrom = extractDomain(process.env.SMTP_FROM || process.env.SMTP_USER || "");
  return [primary, smtpFrom].filter(Boolean) as string[];
}

function extractDomain(address: string): string | null {
  const match = String(address || "").match(/@([^\s>@]+)/);
  return match ? match[1].toLowerCase().replace(/[>"']/g, "") : null;
}

/**
 * Reads the outreach SMTP settings. Returns null — not a default — when they
 * are absent, because "not configured" must stop a send, never soften into one.
 */
export function outreachTransportConfig(): OutreachTransportConfig | null {
  const host = process.env.OUTREACH_SMTP_HOST?.trim();
  const user = process.env.OUTREACH_SMTP_USER?.trim();
  const pass = process.env.OUTREACH_SMTP_PASS?.trim();
  const from = (process.env.OUTREACH_FROM_EMAIL || "").trim();

  if (!host || !user || !pass || !from) return null;

  const port = Number(process.env.OUTREACH_SMTP_PORT || 587);
  return {
    host,
    user,
    pass,
    from,
    port: Number.isFinite(port) && port > 0 ? Math.floor(port) : 587,
    secure: String(process.env.OUTREACH_SMTP_SECURE || "").toLowerCase() === "true",
  };
}

export function outreachTransportConfigured(): boolean {
  return outreachTransportConfig() !== null;
}

/**
 * Why a send would be refused, in words an admin can act on. Returns null when
 * the transport is good to go. The console reads this to explain itself.
 */
export function outreachTransportProblem(): string | null {
  const config = outreachTransportConfig();
  if (!config) {
    return "Outreach SMTP is not configured. Set OUTREACH_SMTP_HOST, OUTREACH_SMTP_USER, OUTREACH_SMTP_PASS and OUTREACH_FROM_EMAIL to a provider and domain used only for cold outreach.";
  }

  const fromDomain = extractDomain(config.from);
  if (!fromDomain) {
    return `OUTREACH_FROM_EMAIL ("${config.from}") does not contain a valid address.`;
  }

  if (protectedDomains().includes(fromDomain) && !allowPrimaryDomain()) {
    return `Refusing to send cold outreach from ${fromDomain} — that domain carries your OTP, invoice and billing email. Register a separate outreach domain and point OUTREACH_FROM_EMAIL at it.`;
  }

  return null;
}

/** Escape hatch, off by default, for when the outreach domain IS the primary. */
function allowPrimaryDomain(): boolean {
  return String(process.env.OUTREACH_ALLOW_PRIMARY_DOMAIN || "").toLowerCase() === "true";
}

let transporter: nodemailer.Transporter | null = null;
let cachedConfig: string | null = null;

function getTransporter(config: OutreachTransportConfig): nodemailer.Transporter {
  const fingerprint = JSON.stringify(config);
  if (!transporter || cachedConfig !== fingerprint) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    cachedConfig = fingerprint;
  }
  return transporter;
}

/**
 * Sends one outreach email. Every caller is `sendApprovedBatch`, which has
 * already checked approval, caps and suppression — this function's own job is
 * to make sure the message leaves on the right domain, or not at all.
 */
export async function sendOutreachEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string | null;
  /** Campaign's verified sending identity, e.g. "Umer <umer@finovaos-outreach.com>". */
  from?: string | null;
  /** Powers the RFC 8058 one-click unsubscribe header. */
  unsubscribeUrl?: string | null;
}): Promise<OutreachDelivery> {
  const problem = outreachTransportProblem();
  if (problem) {
    await logAttempt(options.to, options.subject, "failed", problem);
    return { success: false, error: problem };
  }

  const config = outreachTransportConfig()!;

  // A per-campaign sendFrom wins, but only if it stays off the protected
  // domains — otherwise a typo in the console could undo the whole guard.
  let from = config.from;
  if (options.from) {
    const candidate = extractDomain(options.from);
    if (candidate && (!protectedDomains().includes(candidate) || allowPrimaryDomain())) {
      from = options.from;
    }
  }

  const headers: Record<string, string> = {};
  if (options.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${options.unsubscribeUrl}>`;
    // Gmail and Yahoo require this on bulk mail; the endpoint answers POST.
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const info = await getTransporter(config).sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
      headers,
    });
    await logAttempt(options.to, options.subject, "sent");
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    const message = error?.message || "Outreach delivery failed";
    await logAttempt(options.to, options.subject, "failed", message);
    return { success: false, error: message };
  }
}

/** Proves the credentials work without mailing a real prospect. */
export async function verifyOutreachTransport(): Promise<{ success: boolean; message: string }> {
  const problem = outreachTransportProblem();
  if (problem) return { success: false, message: problem };

  try {
    await getTransporter(outreachTransportConfig()!).verify();
    return { success: true, message: "Outreach SMTP credentials are valid." };
  } catch (error: any) {
    return { success: false, message: error?.message || "Outreach SMTP verification failed." };
  }
}

function logAttempt(to: string, subject: string, status: string, error?: string) {
  return (prisma as any).emailLog
    .create({ data: { to, subject: `[outreach] ${subject}`, status, ...(error ? { error } : {}) } })
    .catch(() => {});
}
