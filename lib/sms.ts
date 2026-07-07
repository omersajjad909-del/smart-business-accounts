// Required for Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
// Optional for AWS SNS: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_SNS_SENDER_ID

import twilio from "twilio";
import { sendWhatsApp } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

type SmsPayload = {
  to: string;
  message: string;
};

type SmsResult = {
  success: boolean;
  provider: "sms" | "whatsapp" | "none" | "twilio" | "sns";
  error?: string;
  messageId?: string;
};

// ─── Phone normalisation ──────────────────────────────────────────────────────

export function normalizePhone(phone: string): string {
  const cleaned = String(phone || "").trim();
  if (!cleaned) return "";
  const digits = cleaned.replace(/\D/g, "");
  if (!digits) return "";
  if (cleaned.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

// ─── Region detection ─────────────────────────────────────────────────────────

export function detectRegion(phone: string): "us" | "eu" | "asia" | "other" {
  const normalized = normalizePhone(phone);

  if (normalized.startsWith("+1")) return "us";

  const euPrefixes = [
    "+44", "+33", "+49", "+31", "+34", "+39",
    "+46", "+47", "+45", "+358", "+351", "+30",
  ];
  for (const prefix of euPrefixes) {
    if (normalized.startsWith(prefix)) return "eu";
  }

  const asiaPrefixes = [
    "+81", "+82", "+86", "+65", "+91",
    "+60", "+62", "+66", "+84", "+63",
  ];
  for (const prefix of asiaPrefixes) {
    if (normalized.startsWith(prefix)) return "asia";
  }

  return "other";
}

// ─── Provider selection ───────────────────────────────────────────────────────

export function getBestSmsProvider(
  phone: string
): "twilio" | "sns" | "generic" {
  const region = detectRegion(phone);
  const twilioConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID);
  const snsConfigured = Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  );

  if (region === "us" || region === "eu") {
    return twilioConfigured ? "twilio" : "generic";
  }

  if (region === "asia") {
    if (snsConfigured) return "sns";
    return twilioConfigured ? "twilio" : "generic";
  }

  // other
  return twilioConfigured ? "twilio" : "generic";
}

// ─── Twilio sender ────────────────────────────────────────────────────────────

export async function sendSmsTwilio({
  to,
  message,
  from,
}: {
  to: string;
  message: string;
  from?: string;
}): Promise<{ success: boolean; provider: "twilio"; messageId?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = from || process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      provider: "twilio",
      error: "Twilio is not fully configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.",
    };
  }

  try {
    const client = twilio(accountSid, authToken);
    const msg = await client.messages.create({
      to,
      from: fromNumber,
      body: message,
    });
    return { success: true, provider: "twilio", messageId: msg.sid };
  } catch (error: any) {
    console.error("[SMS/Twilio] Error:", error);
    return {
      success: false,
      provider: "twilio",
      error: error?.message || "Twilio send failed",
    };
  }
}

// ─── Generic HTTP SMS sender ──────────────────────────────────────────────────

async function sendSmsGeneric(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const smsApiUrl = process.env.SMS_API_URL || "";
  const smsApiKey = process.env.SMS_API_KEY || "";
  const smsFrom = process.env.SMS_FROM || "";
  const authHeader = process.env.SMS_API_AUTH_HEADER || "Authorization";
  const authScheme = process.env.SMS_API_AUTH_SCHEME || "Bearer";

  if (!smsApiUrl) return { success: false, error: "SMS_API_URL not set" };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (smsApiKey) {
    headers[authHeader] = authScheme ? `${authScheme} ${smsApiKey}` : smsApiKey;
  }

  try {
    const response = await fetch(smsApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ to: phone, from: smsFrom || undefined, message }),
    });

    if (response.ok) return { success: true };

    const errorText = await response.text().catch(() => "SMS send failed");
    console.error("[SMS/Generic] Send failed:", errorText);
    return { success: false, error: errorText };
  } catch (error: any) {
    console.error("[SMS/Generic] Error:", error);
    return { success: false, error: error?.message };
  }
}

// ─── Main sendSms (Twilio-first, then generic, then WhatsApp) ─────────────────

export async function sendSms({ to, message }: SmsPayload): Promise<SmsResult> {
  const phone = normalizePhone(to);
  if (!phone) {
    return { success: false, provider: "none", error: "Invalid phone number" };
  }

  // 1. Try Twilio first if configured
  if (process.env.TWILIO_ACCOUNT_SID) {
    const twilioResult = await sendSmsTwilio({ to: phone, message });
    if (twilioResult.success) {
      return { success: true, provider: "twilio", messageId: twilioResult.messageId };
    }
    console.error("[SMS] Twilio failed, falling back:", twilioResult.error);
  }

  // 2. Try generic SMS API
  const genericResult = await sendSmsGeneric(phone, message);
  if (genericResult.success) {
    return { success: true, provider: "sms" };
  }

  // 3. Fall back to WhatsApp
  const whatsappResult = await sendWhatsApp("", {
    to: phone,
    type: "text",
    text: message,
  });

  if (whatsappResult.success) {
    return { success: true, provider: "whatsapp" };
  }

  return {
    success: false,
    provider: "none",
    error:
      "SMS is not configured. Set SMS_API_URL/SMS_API_KEY, TWILIO_ACCOUNT_SID, or WhatsApp credentials.",
  };
}

// ─── Region-routed SMS sender ─────────────────────────────────────────────────

export async function sendSmsWithRegionRouting({
  to,
  message,
  type,
  companyId,
}: {
  to: string;
  message: string;
  type?: string;
  companyId?: string;
}): Promise<SmsResult> {
  const phone = normalizePhone(to);
  if (!phone) {
    return { success: false, provider: "none", error: "Invalid phone number" };
  }

  const region = detectRegion(phone);
  const providerName = getBestSmsProvider(phone);

  let result: SmsResult;

  if (providerName === "twilio") {
    const r = await sendSmsTwilio({ to: phone, message });
    result = { success: r.success, provider: "twilio", messageId: r.messageId, error: r.error };
  } else if (providerName === "sns") {
    // Dynamic import — graceful fallback if awsSns not available
    try {
      const { sendSmsSns } = await import("@/lib/awsSns");
      const r = await sendSmsSns({ to: phone, message });
      result = {
        success: r.success,
        provider: "sns",
        messageId: r.messageId,
        error: r.error,
      };
    } catch {
      // SNS module unavailable — fall back to Twilio
      const r = await sendSmsTwilio({ to: phone, message });
      result = { success: r.success, provider: "twilio", messageId: r.messageId, error: r.error };
    }
  } else {
    const r = await sendSmsGeneric(phone, message);
    result = { success: r.success, provider: "sms", error: r.error };
  }

  // Log to ActivityLog
  try {
    await prisma.activityLog.create({
      data: {
        action: "SMS_SENT_GLOBAL",
        companyId: companyId || undefined,
        details: JSON.stringify({
          to: phone,
          region,
          provider: providerName,
          type: type || "sms",
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        }),
      },
    });
  } catch (logErr) {
    console.error("[SMS] ActivityLog write failed:", logErr);
  }

  return result;
}

// ─── Verification helper (unchanged) ─────────────────────────────────────────

export async function sendVerificationSms(
  phone: string,
  name: string,
  code: string
) {
  return sendSms({
    to: phone,
    message: `Hi ${name}, your FinovaOS verification code is ${code}. Valid for 15 minutes. Do not share this code.`,
  });
}
