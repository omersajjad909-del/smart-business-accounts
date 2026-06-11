import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPkPaymentReceivedEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, plan, billingCycle, method, mobileNumber, txId, amountPkr, companyId, userId } =
      await req.json();

    if (!email || !plan || !method || !mobileNumber || !txId || !amountPkr) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["jazzcash", "easypaisa"].includes(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const request = await (prisma as any).pkPaymentRequest.create({
      data: {
        email: email.trim().toLowerCase(),
        plan: String(plan).toUpperCase(),
        billingCycle: billingCycle || "monthly",
        method,
        mobileNumber: String(mobileNumber).trim(),
        txId: String(txId).trim(),
        amountPkr: Number(amountPkr),
        companyId: companyId || null,
        userId: userId || null,
        status: "PENDING",
      },
    });

    const methodLabel = method === "jazzcash" ? "JazzCash" : "Easypaisa";

    // Admin bell notification
    prisma.notification.create({
      data: {
        title: `🇵🇰 New ${methodLabel} Payment`,
        message: `PKR ${Number(amountPkr).toLocaleString()} · ${String(plan).toUpperCase()} · ${email} · TX: ${txId}`,
        type: "INFO",
        link: "/admin/pk-payments",
        isRead: false,
      },
    }).catch(() => {});

    // Admin email notification
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || "";
    if (adminEmail) {
      sendPkPaymentReceivedEmail({
        adminEmail,
        customerEmail: request.email,
        method: request.method,
        mobileNumber: request.mobileNumber,
        txId: request.txId,
        amountPkr: request.amountPkr,
        plan: request.plan,
        billingCycle: request.billingCycle,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, id: request.id });
  } catch (err) {
    console.error("[pk-payment] POST error:", err);
    return NextResponse.json({ error: "Failed to submit payment request" }, { status: 500 });
  }
}
