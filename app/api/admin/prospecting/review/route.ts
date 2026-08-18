import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { renderEmailHtml, containsBannedOffer } from "@/lib/prospecting/drafting";
import { postalAddress, baseUrl, isSendableAddress, addSuppression } from "@/lib/prospecting/sending";

export const runtime = "nodejs";

const db = prisma as any;

const SENDER_NAME = process.env.OUTREACH_SENDER_NAME || "Umer Sajjad";
const SENDER_TITLE = process.env.OUTREACH_SENDER_TITLE || "Founder";

/** The review queue: every drafted email waiting on a human decision. */
export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const sp = req.nextUrl.searchParams;
    const campaignId = sp.get("campaignId");
    const status = sp.get("status") || "pending_review";
    const tier = sp.get("tier");
    const q = (sp.get("q") || "").trim();
    const take = Math.min(Math.max(Number(sp.get("take")) || 50, 1), 200);
    const skip = Math.max(Number(sp.get("skip")) || 0, 0);

    const where: any = {};
    if (campaignId) where.campaignId = campaignId;
    if (status !== "all") where.status = status;
    if (tier && tier !== "all") where.prospect = { tier };
    if (q) {
      where.OR = [
        { toEmail: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { prospect: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [emails, total] = await Promise.all([
      db.outreachEmail.findMany({
        where,
        orderBy: [{ prospect: { score: "desc" } }, { createdAt: "asc" }],
        take,
        skip,
        include: {
          prospect: {
            select: {
              id: true, name: true, website: true, domain: true, industry: true,
              city: true, country: true, employeeCount: true, warehouseCount: true,
              locationCount: true, currentSoftware: true, score: true, tier: true,
              scoreBreakdown: true, scoreReason: true, source: true,
            },
          },
        },
      }),
      db.outreachEmail.count({ where }),
    ]);

    // Flag anything the sender would refuse, so it shows in the queue rather
    // than failing silently three days later.
    const decorated = emails.map((e: any) => {
      const guard = isSendableAddress(e.toEmail);
      return { ...e, sendBlocked: guard.ok ? null : guard.reason };
    });

    return NextResponse.json({ emails: decorated, total, take, skip });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** Approve, reject, or edit-and-approve a single email. */
export async function PATCH(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await req.json();
    const id = String(body.id || "");
    const action = String(body.action || "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const email = await db.outreachEmail.findUnique({
      where: { id },
      include: { prospect: { select: { id: true, name: true } } },
    });
    if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 });
    if (email.status === "sent") {
      return NextResponse.json({ error: "This email has already been sent." }, { status: 400 });
    }

    const data: Record<string, unknown> = {
      reviewedBy: admin.email || admin.id,
      reviewedAt: new Date(),
    };

    // An edit is applied whether the admin then approves or just saves.
    const subject = body.subject !== undefined ? String(body.subject).trim().slice(0, 200) : null;
    const bodyText = body.bodyText !== undefined ? String(body.bodyText).trim() : null;

    if (subject !== null || bodyText !== null) {
      const nextSubject = subject ?? email.subject;
      const nextBody = bodyText ?? email.bodyText;

      const banned = containsBannedOffer(`${nextSubject}\n${nextBody}`);
      if (banned) {
        return NextResponse.json(
          { error: `The copy promises "${banned}". FinovaOS has no free trial — remove it before approving.` },
          { status: 400 },
        );
      }

      data.subject = nextSubject;
      data.bodyText = nextBody;
      data.editedByHuman = true;
      data.bodyHtml = renderEmailHtml({
        bodyText: nextBody,
        unsubToken: email.unsubToken,
        senderName: SENDER_NAME,
        senderTitle: SENDER_TITLE,
        postalAddress: postalAddress(),
        baseUrl: baseUrl(),
        rtl: email.language === "ur" || email.language === "ar",
      });
    }

    if (action === "approve") {
      const guard = isSendableAddress(email.toEmail);
      if (!guard.ok) return NextResponse.json({ error: guard.reason }, { status: 400 });
      data.status = "approved";
      data.rejectReason = null;
      if (body.scheduledFor) data.scheduledFor = new Date(body.scheduledFor);
    } else if (action === "reject") {
      data.status = "rejected";
      data.rejectReason = body.reason ? String(body.reason).slice(0, 300) : "Rejected by admin";
      // A rejection usually means "never contact these people", so honour that.
      if (body.suppress) {
        await addSuppression(email.toEmail, "manual", `Rejected in review: ${data.rejectReason}`);
      }
    } else if (action !== "save") {
      return NextResponse.json({ error: 'action must be "approve", "reject" or "save"' }, { status: 400 });
    }

    const updated = await db.outreachEmail.update({ where: { id }, data });

    if (action === "approve" || action === "reject") {
      await db.prospectCompany.update({
        where: { id: email.prospectId },
        data: { status: action === "approve" ? "approved" : "rejected" },
      }).catch(() => {});

      await logAdminAction({
        adminId: admin.id,
        adminEmail: admin.email,
        action: action === "approve" ? "OUTREACH_EMAIL_APPROVE" : "OUTREACH_EMAIL_REJECT",
        targetType: "OutreachEmail",
        targetId: id,
        targetLabel: `${email.prospect?.name} <${email.toEmail}>`,
        details: { edited: Boolean(data.editedByHuman), reason: data.rejectReason },
      });
    }

    return NextResponse.json({ email: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * Bulk approve or reject.
 *
 * Bulk approval is capped and always scoped to a campaign — "approve
 * everything in the database" is not an action this endpoint offers.
 */
export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await req.json();
    const action = String(body.action || "");
    const campaignId = String(body.campaignId || "");
    if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [];
    const tier = body.tier ? String(body.tier) : null;
    const minScore = body.minScore != null ? Number(body.minScore) : null;
    const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 500);

    if (!ids.length && !tier && minScore == null) {
      return NextResponse.json(
        { error: "Select emails, or give a tier or a minimum score. Blanket approval is not allowed." },
        { status: 400 },
      );
    }

    const where: any = { campaignId, status: "pending_review" };
    if (ids.length) where.id = { in: ids };
    if (tier || minScore != null) {
      where.prospect = {
        ...(tier ? { tier } : {}),
        ...(minScore != null ? { score: { gte: minScore } } : {}),
      };
    }

    const targets = await db.outreachEmail.findMany({
      where,
      take: limit,
      select: { id: true, toEmail: true, prospectId: true },
    });

    const approvable = action === "approve"
      ? targets.filter((t: any) => isSendableAddress(t.toEmail).ok)
      : targets;
    const blocked = targets.length - approvable.length;

    if (approvable.length) {
      await db.outreachEmail.updateMany({
        where: { id: { in: approvable.map((t: any) => t.id) } },
        data: {
          status: action === "approve" ? "approved" : "rejected",
          reviewedBy: admin.email || admin.id,
          reviewedAt: new Date(),
          ...(action === "reject"
            ? { rejectReason: body.reason ? String(body.reason).slice(0, 300) : "Bulk rejected" }
            : { rejectReason: null }),
        },
      });

      await db.prospectCompany.updateMany({
        where: { id: { in: approvable.map((t: any) => t.prospectId) } },
        data: { status: action === "approve" ? "approved" : "rejected" },
      });
    }

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: action === "approve" ? "OUTREACH_BULK_APPROVE" : "OUTREACH_BULK_REJECT",
      targetType: "OutreachCampaign",
      targetId: campaignId,
      details: { count: approvable.length, blocked, tier, minScore },
    });

    return NextResponse.json({
      updated: approvable.length,
      blocked,
      message: blocked
        ? `${approvable.length} ${action}d. ${blocked} skipped — placeholder or invalid addresses.`
        : `${approvable.length} ${action}d.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
