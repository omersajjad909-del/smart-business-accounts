import { getCompanyCommsConfig } from "./companyCommsConfig";

export interface WhatsAppMessage {
  to: string; // phone with country code e.g. 923001234567
  type: "text" | "template";
  text?: string;
  templateName?: string;
  templateParams?: string[];
  languageCode?: string;
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsApp(
  companyId: string,
  message: WhatsAppMessage
): Promise<WhatsAppResult> {
  try {
    const config = await getCompanyCommsConfig(companyId);
    if (!config.whatsapp.enabled || !config.whatsapp.token || !config.whatsapp.phoneId) {
      return { success: false, error: "WhatsApp not configured" };
    }

    const { token, phoneId, apiVersion = "v18.0" } = config.whatsapp;
    const url = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;

    let body: Record<string, unknown>;

    if (message.type === "template") {
      body = {
        messaging_product: "whatsapp",
        to: message.to,
        type: "template",
        template: {
          name: message.templateName,
          language: { code: message.languageCode || "en_US" },
          components: message.templateParams?.length
            ? [{ type: "body", parameters: message.templateParams.map(p => ({ type: "text", text: p })) }]
            : [],
        },
      };
    } else {
      body = {
        messaging_product: "whatsapp",
        to: message.to,
        type: "text",
        text: { body: message.text || "" },
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data?.error?.message || "WhatsApp API error" };
    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (e: any) {
    return { success: false, error: e?.message || "Unknown error" };
  }
}

// Format Pakistani number: 03001234567 → 923001234567
export function formatPhone(phone: string): string {
  let n = phone.replace(/[\s\-\+\(\)]/g, "");
  if (n.startsWith("0") && n.length === 11) n = "92" + n.slice(1);
  return n;
}
