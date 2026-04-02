import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext } from "@/lib/finovaAI";

export const runtime = "nodejs";
export const maxDuration = 30;

type ReminderPriority = "urgent" | "high" | "medium" | "low";

interface InvoiceReminderItem {
  customer: string;
  invoiceRef: string;
  amount: number;
  daysAgo: number;
  priority: ReminderPriority;
  reason: string;
  suggestedAction: string;
  channel: "email" | "phone" | "whatsapp";
}

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const ctx = await buildFinancialContext(companyId);
    const reminders: InvoiceReminderItem[] = [];

    for (const invoice of ctx.recentInvoices.slice(0, 8)) {
      const amount = Number(invoice.amount || 0);
      const daysAgo = Number(invoice.daysAgo || 0);
      const overduePressure = ctx.receivables.overdue > 0 && daysAgo >= 15;
      const priority: ReminderPriority =
        daysAgo >= 45 ? "urgent" :
        daysAgo >= 30 ? "high" :
        daysAgo >= 15 ? "medium" :
        "low";

      if (priority === "low" && !overduePressure) continue;

      reminders.push({
        customer: invoice.customer || "Customer",
        invoiceRef: invoice.ref || "Invoice",
        amount,
        daysAgo,
        priority,
        reason:
          daysAgo >= 45
            ? "This invoice has been open for a long time and may turn into a collection risk."
            : daysAgo >= 30
              ? "Payment follow-up is due based on invoice age and customer exposure."
              : "A soft reminder can help accelerate collection before the invoice becomes overdue.",
        suggestedAction:
          priority === "urgent"
            ? "Call the customer today and send a formal payment reminder."
            : priority === "high"
              ? "Send a reminder email and follow up with a phone call."
              : "Send a polite reminder with the invoice reference and amount.",
        channel: priority === "urgent" ? "phone" : priority === "high" ? "email" : "whatsapp",
      });
    }

    const highestRiskCustomer = ctx.customerPaymentHistory
      .slice()
      .sort((a, b) => (b.overdueCount * 100 + b.avgDaysToPay) - (a.overdueCount * 100 + a.avgDaysToPay))[0];

    const summary = [
      reminders.length
        ? `${reminders.length} invoice reminder${reminders.length > 1 ? "s" : ""} should be sent now.`
        : "No urgent invoice reminders are currently suggested.",
      ctx.receivables.overdue > 0
        ? `${ctx.receivables.overdueCount} invoice(s) are already overdue, totaling ${ctx.company.currency} ${Math.round(ctx.receivables.overdue).toLocaleString()}.`
        : "There are no overdue receivables right now.",
      highestRiskCustomer
        ? `${highestRiskCustomer.name} shows the highest late-payment tendency with an average of ${highestRiskCustomer.avgDaysToPay} days to pay.`
        : "Customer payment behavior will appear once more receipt history is available.",
    ];

    return NextResponse.json({
      reminders: reminders.slice(0, 6),
      summary,
      totals: {
        overdueReceivables: ctx.receivables.overdue,
        overdueCount: ctx.receivables.overdueCount,
      },
    });
  } catch (err) {
    console.error("AI invoice reminders error:", err);
    return NextResponse.json({ error: "Failed to generate invoice reminders" }, { status: 500 });
  }
}
