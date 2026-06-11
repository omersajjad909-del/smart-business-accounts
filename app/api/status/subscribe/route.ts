import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const existing = await prisma.statusSubscriber.findUnique({ where: { email } });

    if (existing) {
      if (existing.confirmed) {
        return NextResponse.json({ message: "already_subscribed" });
      }
      // resend confirmation
      await sendConfirmation(email, existing.token);
      return NextResponse.json({ message: "confirmation_resent" });
    }

    const subscriber = await prisma.statusSubscriber.create({
      data: { email },
    });

    await sendConfirmation(email, subscriber.token);

    return NextResponse.json({ message: "confirmation_sent" });
  } catch (err) {
    console.error("Status subscribe error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

async function sendConfirmation(email: string, token: string) {
  const confirmUrl = `${BASE}/api/status/confirm?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Confirm your FinovaOS status subscription",
    html: `
      <div style="font-family:'Outfit',sans-serif;max-width:520px;margin:0 auto;background:#080c1e;color:white;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.1)">
        <div style="background:linear-gradient(135deg,#0f1535,#12183d);padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,.07)">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px">FinovaOS <span style="color:#34d399">Status</span></div>
        </div>
        <div style="padding:32px">
          <h2 style="font-size:20px;font-weight:700;margin:0 0 12px">Confirm your subscription</h2>
          <p style="color:rgba(255,255,255,.55);font-size:14px;line-height:1.7;margin:0 0 28px">
            You'll receive email alerts whenever a service incident starts or is resolved. Click below to confirm.
          </p>
          <a href="${confirmUrl}" style="display:inline-block;padding:12px 28px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;font-weight:700;font-size:14px;text-decoration:none">
            Confirm Subscription →
          </a>
          <p style="color:rgba(255,255,255,.25);font-size:12px;margin-top:24px">
            If you didn't request this, ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}
