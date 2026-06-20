import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/emailTemplates";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  if (!to) return NextResponse.json({ error: "?to= param required" }, { status: 400 });

  const features = [
    "Up to 20 users",
    "Everything in Starter",
    "Inventory management",
    "Bank reconciliation",
    "Multi-branch support",
    "HR & payroll",
    "CRM & advanced reports",
    "Priority support",
  ];

  const html = emailTemplates.welcomeSubscription(
    "Umer",
    "pro",
    features,
    "https://app.finovaos.app/dashboard",
    "PK",
  );

  const result = await sendEmail({
    to,
    subject: "Welcome to FinovaOS! Your Professional plan is active 🎉",
    html,
  });

  return NextResponse.json(result);
}
