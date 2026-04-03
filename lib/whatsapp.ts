// FILE: lib/whatsapp.ts
// WhatsApp notification via WhatsApp Business API (Meta)
// Or use a third-party like Twilio, MessageBird, or WATI
// Set WHATSAPP_API_URL and WHATSAPP_TOKEN in .env
import { getCompanyCommsConfig } from "@/lib/companyCommsConfig";

type WAMessage = {
  to: string;        // Phone number with country code e.g. "923001234567"
  template?: string; // Template name (if using templates)
  message?: string;  // Plain text (for sandbox/test)
  params?: string[]; // Template parameters
  companyId?: string;
};

export async function sendWhatsApp({ to, template, message, params, companyId }: WAMessage): Promise<boolean> {
  let token = process.env.WHATSAPP_TOKEN;
  let phoneId = process.env.WHATSAPP_PHONE_ID;
  let apiVersion = "v18.0";

  if (companyId) {
    const companyConfig = await getCompanyCommsConfig(companyId);
    if (companyConfig.whatsapp.enabled && companyConfig.whatsapp.token && companyConfig.whatsapp.phoneId) {
      token = companyConfig.whatsapp.token;
      phoneId = companyConfig.whatsapp.phoneId;
      apiVersion = companyConfig.whatsapp.apiVersion || "v18.0";
    }
  }

  if (!token || !phoneId) {
    console.warn("[WhatsApp] Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_ID in .env");
    return false;
  }

  try {
    const body = template ? {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "template",
      template: {
        name: template,
        language: { code: "en" },
        components: params ? [{ type:"body", parameters: params.map(p=>({ type:"text", text:p })) }] : [],
      },
    } : {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: message || "" },
    };

    const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[WhatsApp] Send failed:", err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[WhatsApp] Error:", e);
    return false;
  }
}

// ── Pre-built notification helpers ──

export const whatsappNotifications = {

  // Invoice sent to customer
  invoiceSent: (phone: string, customerName: string, invoiceNo: string, amount: string, viewUrl: string) =>
    sendWhatsApp({
      to: phone,
      message: `Hi ${customerName},\n\nYou have a new invoice from us.\n\n📄 Invoice: ${invoiceNo}\n💰 Amount: ${amount}\n\n🔗 View & Pay: ${viewUrl}\n\n— Finova`,
    }),

  // Payment reminder
  paymentReminder: (phone: string, customerName: string, invoiceNo: string, amount: string, daysOverdue: number) =>
    sendWhatsApp({
      to: phone,
      message: `Hi ${customerName},\n\n⚠️ Reminder: Invoice ${invoiceNo} for ${amount} is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : "due today"}.\n\nPlease arrange payment at your earliest convenience.\n\n— Finova`,
    }),

  // OTP verification
  otp: (phone: string, name: string, code: string) =>
    sendWhatsApp({
      to: phone,
      message: `Hi ${name},\n\nYour Finova verification code is:\n\n*${code}*\n\nValid for 15 minutes. Do not share this code.\n\n— Finova`,
    }),

  // Welcome message
  welcome: (phone: string, name: string, companyName: string) =>
    sendWhatsApp({
      to: phone,
      message: `Welcome to Finova, ${name}! 🎉\n\nYour ${companyName} workspace is ready.\n\n🚀 Get started: ${(process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app")}/dashboard\n\nNeed help? Reply to this message.\n\n— The Finova Team`,
    }),

  // Low stock alert (to business owner)
  lowStock: (phone: string, itemName: string, currentStock: number, minStock: number) =>
    sendWhatsApp({
      to: phone,
      message: `⚠️ *Low Stock Alert*\n\nItem: ${itemName}\nCurrent Stock: ${currentStock}\nMinimum Level: ${minStock}\n\nPlease reorder to avoid stockout.\n\n— Finova`,
    }),

  // Payroll processed
  payrollProcessed: (phone: string, employeeName: string, month: string, netSalary: string) =>
    sendWhatsApp({
      to: phone,
      message: `Hi ${employeeName},\n\nYour salary for *${month}* has been processed.\n\n💰 Net Salary: *${netSalary}*\n\nYour payslip is ready in Finova.\n\n— HR Team`,
    }),
};

