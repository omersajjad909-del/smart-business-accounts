import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { parseCommandToBrief, describeBrief } from "@/lib/prospecting/brief";
import { availableProviders, activeProvider } from "@/lib/prospecting/discovery";
import { sendingEnabled, globalDailyCap, postalAddress } from "@/lib/prospecting/sending";
import { outreachTransportProblem } from "@/lib/prospecting/transport";
import { hasUsableAIKey } from "@/lib/marketingAutopilotAI";

export const runtime = "nodejs";

const db = prisma as any;

/** Everything the admin needs to know is switched on, in one object. */
function readiness() {
  const provider = activeProvider();
  return {
    discoveryProvider: provider,
    availableProviders: availableProviders(),
    usingSampleData: provider === "sample",
    emailVerification: Boolean(process.env.ZEROBOUNCE_API_KEY),
    contactFinder: Boolean(process.env.HUNTER_API_KEY),
    // A placeholder key is not a key — hasUsableAIKey rejects "YOUR_..." so the
    // console does not report AI as ready when every call would 401.
    aiConfigured: hasUsableAIKey(process.env.ANTHROPIC_API_KEY) || hasUsableAIKey(process.env.OPENAI_API_KEY),
    sendingEnabled: sendingEnabled(),
    globalDailyCap: globalDailyCap(),
    postalAddressSet: Boolean(process.env.OUTREACH_POSTAL_ADDRESS),
    postalAddress: postalAddress(),
    sendingTransportProblem: outreachTransportProblem(),
  };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const campaigns = await db.outreachCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // One grouped query rather than N per campaign.
    const [prospectCounts, emailCounts] = await Promise.all([
      db.prospectCompany.groupBy({
        by: ["campaignId", "status"],
        _count: { _all: true },
      }),
      db.outreachEmail.groupBy({
        by: ["campaignId", "status"],
        _count: { _all: true },
      }),
    ]);

    const tally = (rows: any[], campaignId: string) =>
      rows
        .filter((r) => r.campaignId === campaignId)
        .reduce((acc: Record<string, number>, r) => {
          acc[r.status] = (acc[r.status] || 0) + r._count._all;
          return acc;
        }, {});

    return NextResponse.json({
      readiness: readiness(),
      campaigns: campaigns.map((c: any) => ({
        ...c,
        summary: describeBrief(c.brief),
        prospectCounts: tally(prospectCounts, c.id),
        emailCounts: tally(emailCounts, c.id),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await req.json();
    const command = String(body.command || "").trim();
    if (command.length < 5) {
      return NextResponse.json(
        { error: "Describe what you want in a sentence, e.g. 'find 200 trading companies in Karachi'." },
        { status: 400 },
      );
    }

    const brief = await parseCommandToBrief(command);

    // The UI can override anything the parser inferred.
    if (Array.isArray(body.industries) && body.industries.length) brief.industries = body.industries;
    if (Array.isArray(body.countries) && body.countries.length) brief.countries = body.countries;
    if (body.targetCount) brief.targetCount = Math.min(Math.max(Number(body.targetCount) || 100, 1), 2000);
    if (body.language) brief.language = body.language;
    if (body.tone) brief.tone = body.tone;

    const campaign = await db.outreachCampaign.create({
      data: {
        name: String(body.name || "").trim() || `${brief.industries[0]} · ${brief.countries.join("/")} · ${brief.targetCount}`,
        command,
        brief: brief as any,
        targetCount: brief.targetCount,
        dailyCap: Math.min(Math.max(Number(body.dailyCap) || 40, 1), globalDailyCap()),
        sendFrom: body.sendFrom ? String(body.sendFrom).slice(0, 200) : null,
        status: "draft",
        progress: {},
        createdBy: admin.email || admin.id,
      },
    });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "PROSPECTING_CAMPAIGN_CREATE",
      targetType: "OutreachCampaign",
      targetId: campaign.id,
      targetLabel: campaign.name,
      details: { command, brief },
    });

    return NextResponse.json({
      campaign: { ...campaign, summary: describeBrief(brief) },
      readiness: readiness(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
