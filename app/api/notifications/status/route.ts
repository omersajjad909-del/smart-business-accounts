import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { getCompanyCommsConfig } from "@/lib/companyCommsConfig";

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  const companyConfig = companyId ? await getCompanyCommsConfig(companyId) : null;

  return NextResponse.json({
    // WhatsApp and email report only the company's OWN setup. The platform
    // env fallbacks used to count as "Configured" even though nothing could
    // be sent without the company's login — see requireCompanyConfig in
    // lib/email.ts and sendWhatsApp, which both ignore the env values.
    whatsapp: !!(companyConfig?.whatsapp.enabled && companyConfig.whatsapp.token && companyConfig.whatsapp.phoneId),
    sms:      !!(process.env.SMS_API_URL && process.env.SMS_API_KEY),
    email:    !!(companyConfig?.email.enabled && companyConfig.email.host && companyConfig.email.user && companyConfig.email.pass),
  });
}
