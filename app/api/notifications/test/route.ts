import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/whatsapp";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { resolveCompanyId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const { channel, phone } = await req.json();
    const companyId = await resolveCompanyId(req);
    const testMsg = "✅ This is a test notification from FinovaOS. Your notifications are working correctly!";

    if (channel === "whatsapp") {
      const ok = await sendWhatsApp({ to: phone, message: testMsg, companyId: companyId || undefined });
      return NextResponse.json({ success: ok, error: ok ? null : "WhatsApp not configured for this company" });
    }

    if (channel === "sms") {
      const ok = await sendSms({ to: phone, message: testMsg });
      return NextResponse.json({ success: ok, error: ok ? null : "SMS not configured. Check SMS_API_URL and SMS_API_KEY in .env" });
    }

    if (channel === "email") {
      const result = await sendEmail({ to: phone, subject: "FinovaOS Test Notification", html: `<p>${testMsg}</p>`, companyId: companyId || undefined });
      return NextResponse.json({ success: result.success, error: result.error || null });
    }

    return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
