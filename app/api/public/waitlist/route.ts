import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const db = prisma as any;

function buildWaitlistWelcomeEmail(name: string, company: string) {
  const firstName = name.split(" ")[0] || name;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Welcome to the FinovaOS waitlist</title>
</head>
<body style="margin:0;padding:0;background:#f5f6fb;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6fb;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 50%,#7c3aed 100%);padding:36px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="https://www.finovaos.app/icon.png" width="44" height="44" alt="FinovaOS" style="display:block;border-radius:12px;background:rgba(255,255,255,0.15);padding:4px;" />
                  </td>
                  <td style="vertical-align:middle;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                    FinovaOS
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-0.4px;">You're on the list, ${firstName}. 🎉</h1>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#475569;">
                Thanks for joining the FinovaOS early access waitlist for <strong style="color:#0f172a;">${company}</strong>. We're building the AI cloud accounting platform SMEs actually deserve, and you'll be among the first to try it.
              </p>
              <div style="background:#f1f5f9;border-radius:12px;padding:20px 22px;margin:0 0 24px;">
                <div style="font-size:12px;font-weight:700;color:#4f46e5;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:10px;">What happens next</div>
                <ul style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:1.7;">
                  <li>Priority early access when new modules go live</li>
                  <li>Launch pricing locked in — before public rollout</li>
                  <li>Direct product updates from our team (no fluff)</li>
                  <li>First look at AI features: Ask AI, Business Health Score</li>
                </ul>
              </div>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#475569;">
                Meanwhile, feel free to explore what we're building. If you have questions, just reply to this email — a real human will read it.
              </p>
              <div style="text-align:center;margin:8px 0 4px;">
                <a href="https://www.finovaos.app/features" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.2px;">Explore Features →</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Sent via <strong style="color:#6366f1;">FinovaOS</strong> · finovaos.app</p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">Faisalabad, Pakistan · You're getting this because you joined the FinovaOS waitlist.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const company = String(body?.company || "").trim();
    const source = String(body?.source || "waitlist-page").trim();

    if (!name || !email || !company) {
      return NextResponse.json(
        { error: "Name, email, and company are required." },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    await db.newsletterSubscriber.upsert({
      where: { email },
      update: {
        status: "active",
        name,
        unsubscribedAt: null,
        source,
      },
      create: {
        email,
        name,
        source,
        status: "active",
      },
    });

    try {
      const existingLead = await db.lead.findFirst({
        where: {
          email,
          source,
        },
        select: { id: true },
      });

      if (!existingLead) {
        await db.lead.create({
          data: {
            name,
            email,
            company,
            source,
            status: "new",
            priority: "medium",
            message: `Waitlist signup from ${company}`,
          },
        });
      }
    } catch {
      // Lead capture is best-effort so the public waitlist flow never fails for analytics reasons.
    }

    await db.activityLog.create({
      data: {
        action: "WAITLIST_SIGNUP",
        details: JSON.stringify({
          name,
          email,
          company,
          source,
          submittedAt: new Date().toISOString(),
        }),
      },
    }).catch(() => {});

    try {
      await sendEmail({
        to: email,
        subject: "You're on the FinovaOS waitlist 🎉",
        html: buildWaitlistWelcomeEmail(name, company),
      });
    } catch {
      // Welcome email is best-effort — signup succeeds even if send fails.
    }

    return NextResponse.json({
      success: true,
      message: "You're on the list. We'll reach out as soon as early access opens.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to join waitlist." },
      { status: 500 },
    );
  }
}
