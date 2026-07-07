/**
 * SMS Payment Notification API
 *
 * POST /api/automation/sms/payment-notify
 * Body: {
 *   invoiceId?, customerId?, customerName, phone,
 *   amount, currency?, type: "received" | "reminder" | "overdue" | "partial"
 * }
 *
 * Sends a payment-event SMS to the customer and logs it to ActivityLog.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import { sendSms } from "@/lib/sms";

type PaymentType = "received" | "reminder" | "overdue" | "partial";

function buildMessage(
  type: PaymentType,
  amount: string | number,
  currency: string,
): string {
  const amt = `${currency} ${amount}`;
  switch (type) {
    case "received":
      return `Payment of ${amt} received. Thank you! - FinovaOS`;
    case "reminder":
      return `Reminder: Invoice of ${amt} is due. Please pay soon. - FinovaOS`;
    case "overdue":
      return `URGENT: Your payment of ${amt} is overdue. Please settle immediately. - FinovaOS`;
    case "partial":
      return `Partial payment of ${amt} received. Remaining balance pending. - FinovaOS`;
    default:
      return `Payment notice: ${amt}. - FinovaOS`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      invoiceId,
      customerId,
      customerName,
      phone,
      amount,
      currency = "PKR",
      type,
    } = body;

    if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });
    if (!amount && amount !== 0)
      return NextResponse.json({ error: "amount is required" }, { status: 400 });

    const validTypes: PaymentType[] = ["received", "reminder", "overdue", "partial"];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    const message = buildMessage(type as PaymentType, amount, currency);
    const result = await sendSms({ to: phone, message });

    await prisma.activityLog.create({
      data: {
        action: "SMS_PAYMENT_NOTIFY",
        companyId,
        details: JSON.stringify({
          invoiceId: invoiceId || null,
          customerId: customerId || null,
          customerName: customerName || "",
          phone,
          amount,
          currency,
          type,
          message,
          status: result.success ? "sent" : "failed",
          provider: result.provider,
          error: result.error || null,
        }),
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "SMS send failed", provider: result.provider },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, provider: result.provider, message });
  } catch (e: any) {
    console.error("[SMS payment-notify]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
