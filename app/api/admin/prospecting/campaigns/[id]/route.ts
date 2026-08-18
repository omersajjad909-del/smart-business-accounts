import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { describeBrief } from "@/lib/prospecting/brief";
import { sentTodayCount, globalDailyCap } from "@/lib/prospecting/sending";

export const runtime = "nodejs";

const db = prisma as any;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const campaign = await db.outreachCampaign.findUnique({ where: { id } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const [byStatus, byTier, emailsByStatus, sentToday] = await Promise.all([
      db.prospectCompany.groupBy({ by: ["status"], where: { campaignId: id }, _count: { _all: true } }),
      db.prospectCompany.groupBy({ by: ["tier"], where: { campaignId: id }, _count: { _all: true } }),
      db.outreachEmail.groupBy({ by: ["status"], where: { campaignId: id }, _count: { _all: true } }),
      sentTodayCount(id),
    ]);

    const flatten = (rows: any[], key: string) =>
      rows.reduce((acc: Record<string, number>, r) => {
        acc[r[key] ?? "unscored"] = r._count._all;
        return acc;
      }, {});

    return NextResponse.json({
      campaign: { ...campaign, summary: describeBrief(campaign.brief) },
      stats: {
        prospectsByStatus: flatten(byStatus, "status"),
        prospectsByTier: flatten(byTier, "tier"),
        emailsByStatus: flatten(emailsByStatus, "status"),
        sentToday,
        dailyCap: campaign.dailyCap,
        remainingToday: Math.max(Math.min(campaign.dailyCap, globalDailyCap()) - sentToday, 0),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = String(body.name).slice(0, 200);
    if (body.dailyCap !== undefined) {
      data.dailyCap = Math.min(Math.max(Number(body.dailyCap) || 40, 1), globalDailyCap());
    }
    if (body.sendFrom !== undefined) data.sendFrom = body.sendFrom ? String(body.sendFrom).slice(0, 200) : null;

    // Only these transitions are allowed from the UI. Everything else is the
    // pipeline's business — an admin cannot skip a campaign into "sending"
    // past the review queue, they can only open the tap once review is done.
    if (body.status !== undefined) {
      const next = String(body.status);
      const current = await db.outreachCampaign.findUnique({ where: { id }, select: { status: true } });
      if (!current) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

      const allowed: Record<string, string[]> = {
        draft: ["discovering", "paused"],
        discovering: ["paused"], enriching: ["paused"], scoring: ["paused"], drafting: ["paused"],
        review: ["sending", "paused"],
        sending: ["paused", "done"],
        paused: ["discovering", "enriching", "scoring", "drafting", "review", "sending"],
        failed: ["paused", "discovering"],
      };

      if (!(allowed[current.status] || []).includes(next)) {
        return NextResponse.json(
          { error: `Cannot move a campaign from "${current.status}" to "${next}".` },
          { status: 400 },
        );
      }
      data.status = next;
      if (next === "sending") data.lastError = null;
    }

    const campaign = await db.outreachCampaign.update({ where: { id }, data });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "PROSPECTING_CAMPAIGN_UPDATE",
      targetType: "OutreachCampaign",
      targetId: id,
      targetLabel: campaign.name,
      details: data,
    });

    return NextResponse.json({ campaign });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;

    // Deleting a campaign that has already mailed people would destroy the
    // record of who we contacted — which is exactly what we need to keep.
    const sent = await db.outreachEmail.count({ where: { campaignId: id, status: "sent" } });
    if (sent > 0) {
      return NextResponse.json(
        { error: `This campaign has already sent ${sent} emails. Pause it instead — the send record has to be kept.` },
        { status: 400 },
      );
    }

    const campaign = await db.outreachCampaign.delete({ where: { id } });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "PROSPECTING_CAMPAIGN_DELETE",
      targetType: "OutreachCampaign",
      targetId: id,
      targetLabel: campaign.name,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
