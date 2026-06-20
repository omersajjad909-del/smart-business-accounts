import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/emailTemplates";

const FEATURES = [
  "Up to 20 users",
  "Everything in Starter",
  "Inventory management",
  "Bank reconciliation",
  "Multi-branch support",
  "HR & payroll",
  "CRM & advanced reports",
  "Priority support",
];

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  const preview = req.nextUrl.searchParams.get("preview");
  const template = req.nextUrl.searchParams.get("t") || "welcomeSubscription";

  const html = (() => {
    switch (template) {
      case "welcome":
        return emailTemplates.welcome(
          { name: "Umer Sajjad", email: to || "test@test.com" },
          "Professional",
          "Umer's Business",
        );
      case "otp":
        return emailTemplates.otp(
          { name: "Umer Sajjad", email: to || "test@test.com" },
          "847291",
        );
      case "passwordReset":
        return emailTemplates.passwordReset(
          { name: "Umer Sajjad" },
          "https://app.finovaos.app/reset-password?token=demo",
        );
      case "welcomeSubscription":
      default:
        return emailTemplates.welcomeSubscription(
          "Umer",
          "pro",
          FEATURES,
          "https://app.finovaos.app/dashboard",
          "PK",
        );
    }
  })();

  // ?preview=1 — render HTML directly in browser
  if (preview === "1") {
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!to) {
    return NextResponse.json({
      error: "?to= param required, or add &preview=1 to view in browser",
      usage: {
        preview: "/api/dev/test-email?preview=1&t=welcomeSubscription",
        send:    "/api/dev/test-email?to=you@email.com&t=welcomeSubscription",
        templates: ["welcomeSubscription", "welcome", "otp", "passwordReset"],
      },
    }, { status: 400 });
  }

  const result = await sendEmail({
    to,
    subject: "Welcome to FinovaOS — Your Professional plan is active",
    html,
  });

  return NextResponse.json(result);
}
