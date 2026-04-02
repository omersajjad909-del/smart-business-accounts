import { sendWhatsApp } from "@/lib/whatsapp";

type SmsPayload = {
  to: string;
  message: string;
};

type SmsResult = {
  success: boolean;
  provider: "sms" | "whatsapp" | "none";
  error?: string;
};

function normalizePhone(phone: string) {
  const cleaned = String(phone || "").trim();
  if (!cleaned) return "";

  const digits = cleaned.replace(/\D/g, "");
  if (!digits) return "";

  if (cleaned.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

export async function sendSms({
  to,
  message,
}: SmsPayload): Promise<SmsResult> {
  const phone = normalizePhone(to);
  if (!phone) {
    return { success: false, provider: "none", error: "Invalid phone number" };
  }

  const smsApiUrl = process.env.SMS_API_URL || "";
  const smsApiKey = process.env.SMS_API_KEY || "";
  const smsFrom = process.env.SMS_FROM || "";
  const authHeader = process.env.SMS_API_AUTH_HEADER || "Authorization";
  const authScheme = process.env.SMS_API_AUTH_SCHEME || "Bearer";

  if (smsApiUrl) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (smsApiKey) {
        headers[authHeader] = authScheme
          ? `${authScheme} ${smsApiKey}`
          : smsApiKey;
      }

      const response = await fetch(smsApiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          to: phone,
          from: smsFrom || undefined,
          message,
        }),
      });

      if (response.ok) {
        return { success: true, provider: "sms" };
      }

      const errorText = await response.text().catch(() => "SMS send failed");
      console.error("[SMS] Send failed:", errorText);
    } catch (error) {
      console.error("[SMS] Error:", error);
    }
  }

  const whatsappSent = await sendWhatsApp({
    to: phone,
    message,
  });

  if (whatsappSent) {
    return { success: true, provider: "whatsapp" };
  }

  return {
    success: false,
    provider: "none",
    error:
      "SMS is not configured. Set SMS_API_URL/SMS_API_KEY or WhatsApp credentials.",
  };
}

export async function sendVerificationSms(
  phone: string,
  name: string,
  code: string,
) {
  return sendSms({
    to: phone,
    message: `Hi ${name}, your Finova verification code is ${code}. Valid for 15 minutes. Do not share this code.`,
  });
}
