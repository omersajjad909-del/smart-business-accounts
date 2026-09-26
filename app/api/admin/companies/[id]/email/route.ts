import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { resolveCompanyRef } from "@/lib/companyRefServer";
import { emailBase, sendEmail } from "@/lib/email";

const REPLY_TO = "support@finovaos.app";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Admin → customer one-off email (re-engagement, feedback request, help offer).
 * Body is plain text written by the admin; it is escaped and wrapped in the
 * branded layout. {{name}} and {{company}} are filled per recipient.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { id: ref } = await params;
    const id = await resolveCompanyRef(ref);
    if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const subject = String(body?.subject || "").trim().slice(0, 200);
    const message = String(body?.message || "").trim().slice(0, 5000);
    const userIds: string[] = Array.isArray(body?.userIds) ? body.userIds.map(String) : [];
    const ctaLabel = String(body?.ctaLabel || "").trim().slice(0, 60);
    if (!subject || !message) return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    if (userIds.length === 0) return NextResponse.json({ error: "Select at least one recipient" }, { status: 400 });

    const company = await prisma.company.findUnique({ where: { id }, select: { name: true } });
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Only members of this company can be emailed from this page.
    const members = await prisma.userCompany.findMany({
      where: { companyId: id, userId: { in: userIds } },
      select: { user: { select: { id: true, name: true, email: true } } },
    });
    if (members.length === 0) return NextResponse.json({ error: "No valid recipients" }, { status: 400 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.finovaos.app";
    const results = await Promise.all(members.map(async ({ user }) => {
      const fill = (s: string) => s
        .replace(/\{\{\s*name\s*\}\}/gi, user.name || "there")
        .replace(/\{\{\s*company\s*\}\}/gi, company.name);
      const paragraphs = esc(fill(message)).split(/\n{2,}/)
        .map((p) => `<p style="margin:0 0 14px;font-size:14px;color:#334155;line-height:1.7;">${p.replace(/\n/g, "<br/>")}</p>`)
        .join("");
      const cta = ctaLabel ? `
        <div style="text-align:center;margin:26px 0 8px;">
          <a href="${appUrl}/dashboard" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:14px;font-weight:700;">${esc(ctaLabel)}</a>
        </div>` : "";
      const html = emailBase({
        companyName: "FinovaOS",
        badgeText: "Message",
        content: `${paragraphs}${cta}
          <p style="margin:22px 0 0;font-size:12px;color:#94a3b8;">Just reply to this email — it comes straight to our team.</p>`,
      });
      const r = await sendEmail({ to: user.email, subject: fill(subject), html, text: fill(message), replyTo: REPLY_TO });
      return { email: user.email, userId: user.id, success: r.success, error: r.error };
    }));

    const sent = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "SEND_CUSTOMER_EMAIL",
      targetType: "Company",
      targetId: id,
      targetLabel: company.name,
      companyId: id,
      details: { subject, to: sent.map((r) => r.email), failed: failed.map((r) => r.email) },
    });
    if (sent.length) {
      await prisma.activityLog.createMany({
        data: sent.map((r) => ({ companyId: id, userId: r.userId, action: "ADMIN_EMAIL_SENT", details: JSON.stringify({ subject, by: admin.email }) })),
      }).catch(() => {});
    }

    if (sent.length === 0) {
      return NextResponse.json({ error: failed[0]?.error || "Email could not be sent", results }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent: sent.length, failed: failed.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
