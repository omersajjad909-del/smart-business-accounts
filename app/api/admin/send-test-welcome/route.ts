import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/emailTemplates";

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role") || "";
  if (role.toUpperCase() !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { to, name, plan, country } = await req.json();
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app"}/dashboard`;

  const PLAN_FEATURES: Record<string, string[]> = {
    starter:      ["Up to 5 users", "Sales & purchase invoices", "Chart of accounts", "Ledger & trial balance", "Basic reports", "Email support"],
    pro:          ["Up to 20 users", "Everything in Starter", "Inventory management", "Bank reconciliation", "Multi-branch support", "HR & payroll", "CRM & advanced reports", "Priority support"],
    professional: ["Up to 20 users", "Everything in Starter", "Inventory management", "Bank reconciliation", "Multi-branch support", "HR & payroll", "CRM & advanced reports", "Priority support"],
    enterprise:   ["Unlimited users", "Everything in Professional", "API access", "Custom integrations", "Multi-currency", "Guided onboarding", "Advanced audit trails", "Dedicated support"],
    custom:       ["Your selected modules", "Flexible billing", "Dedicated account manager", "Priority support", "Custom onboarding"],
  };

  const planKey  = String(plan || "professional").toLowerCase();
  const features = PLAN_FEATURES[planKey] || PLAN_FEATURES.professional;
  const planLabel = ["pro","professional"].includes(planKey) ? "Professional" : planKey.charAt(0).toUpperCase() + planKey.slice(1);

  const result = await sendEmail({
    to,
    subject: `Welcome to FinovaOS! Your ${planLabel} plan is active 🎉`,
    html: emailTemplates.welcomeSubscription(name || "there", planKey, features, dashboardUrl, country || "PK"),
  });

  return NextResponse.json(result);
}
