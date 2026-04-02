import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { getCompanyCommsConfig } from "@/lib/companyCommsConfig";

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  const companyConfig = companyId ? await getCompanyCommsConfig(companyId) : null;

  return NextResponse.json({
    whatsapp: !!(
      (companyConfig?.whatsapp.enabled && companyConfig.whatsapp.token && companyConfig.whatsapp.phoneId) ||
      (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)
    ),
    sms:      !!(process.env.SMS_API_URL && process.env.SMS_API_KEY),
    email:    !!(
      (companyConfig?.email.enabled && companyConfig.email.user && companyConfig.email.pass) ||
      (process.env.SMTP_HOST && process.env.SMTP_USER)
    ),
  });
}
