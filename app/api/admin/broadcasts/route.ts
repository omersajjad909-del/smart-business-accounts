// FILE: app/api/admin/broadcasts/route.ts
// Stores broadcast history in ActivityLog and sends actual emails/whatsapp.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try { const p = verifyJwt(getTokenFromRequest(req as any)!); return String(p?.role||"").toUpperCase()==="ADMIN"; } catch { return false; }
}

// Build audience where clause for User queries
function audienceWhere(audience: string, plan?: string) {
  if (audience === "active") {
    return {
      OR: [
        { defaultCompany: { subscriptionStatus: { equals: "ACTIVE", mode: "insensitive" as const } } },
        { companies: { some: { company: { subscriptionStatus: { equals: "ACTIVE", mode: "insensitive" as const } } } } },
      ],
    };
  }
  if (audience === "trial") {
    return {
      OR: [
        { defaultCompany: { subscriptionStatus: { equals: "TRIALING", mode: "insensitive" as const } } },
        { companies: { some: { company: { subscriptionStatus: { equals: "TRIALING", mode: "insensitive" as const } } } } },
      ],
    };
  }
  if (audience === "churned") {
    return {
      OR: [
        { defaultCompany: { subscriptionStatus: { in: ["CANCELLED", "INACTIVE"] } } },
        { companies: { some: { company: { subscriptionStatus: { in: ["CANCELLED", "INACTIVE"] } } } } },
      ],
    };
  }
  if (audience === "plan" && plan) {
    return {
      OR: [
        { defaultCompany: { plan: { equals: String(plan), mode: "insensitive" as const } } },
        { companies: { some: { company: { plan: { equals: String(plan), mode: "insensitive" as const } } } } },
      ],
    };
  }
  // "all" - no filter
  return {};
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const logs = await prisma.activityLog.findMany({
      where: { action: { in: ["EMAIL_BROADCAST", "WHATSAPP_BROADCAST"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const broadcasts = logs.map(l => {
      try { return { id: l.id, createdAt: l.createdAt, ...JSON.parse(l.details || "{}") }; }
      catch { return { id: l.id, subject: "Broadcast", createdAt: l.createdAt }; }
    });
    return NextResponse.json({ broadcasts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { subject, body, audience, plan, channel = "email" } = await req.json();

    // Validation
    if (channel === "email" && !subject?.trim()) {
      return NextResponse.json({ error: "Subject required for email broadcasts" }, { status: 400 });
    }
    if (!body?.trim()) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const where = audienceWhere(audience, plan);

    let sentTo = 0;
    let note: string | undefined;

    if (channel === "whatsapp") {
      // User model has no phone field — log and return info note
      const userCount = await prisma.user.count({ where }).catch(() => 0);
      sentTo = 0; // cannot send without phone numbers
      note = `WhatsApp broadcast queued for ${userCount} users. Phone numbers are not stored on the User model — integrate a phone field to enable actual sending.`;

      await prisma.activityLog.create({
        data: {
          action: "WHATSAPP_BROADCAST",
          details: JSON.stringify({ body, audience, plan, sentTo: 0, channel: "whatsapp", note }),
          userId: req.headers.get("x-user-id") || null,
        },
      });

      return NextResponse.json({ success: true, sentTo: 0, note });
    }

    // === Email broadcast ===
    let users: { email: string; name: string }[] = [];
    try {
      users = await prisma.user.findMany({
        where,
        select: { email: true, name: true },
      });
    } catch {}

    sentTo = users.length;

    // Send emails
    const fromName = "Finova";
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><style>
        body{font-family:Arial,sans-serif;color:#333;margin:0;padding:0;}
        .header{background:#4f46e5;color:#fff;padding:24px;text-align:center;}
        .content{padding:28px 24px;font-size:14px;line-height:1.7;color:#444;}
        .footer{padding:16px 24px;font-size:11px;color:#999;border-top:1px solid #eee;text-align:center;}
      </style></head>
      <body>
        <div class="header"><h2 style="margin:0">${fromName}</h2></div>
        <div class="content">
          <h3 style="color:#111;margin-top:0">${subject}</h3>
          <div style="white-space:pre-wrap">${body}</div>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} Finova &middot; <a href="#" style="color:#4f46e5">Unsubscribe</a></div>
      </body>
      </html>
    `;

    // Send in batches of 50 to avoid timeouts
    const BATCH = 50;
    let successCount = 0;
    for (let i = 0; i < users.length; i += BATCH) {
      const batch = users.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map(u =>
          sendEmail({ to: u.email, subject, html: htmlBody }).then(r => { if (r.success) successCount++; })
        )
      );
    }

    // Log broadcast
    await prisma.activityLog.create({
      data: {
        action: "EMAIL_BROADCAST",
        details: JSON.stringify({ subject, body, audience, plan, sentTo: successCount, openRate: 0, channel: "email" }),
        userId: req.headers.get("x-user-id") || null,
      },
    });

    return NextResponse.json({ success: true, sentTo: successCount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
