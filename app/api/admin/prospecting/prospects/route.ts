import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

const db = prisma as any;

/**
 * Every company a campaign found, whatever happened to it afterwards. The
 * review queue only shows drafted emails, so a company skipped for having no
 * contact email would otherwise vanish without a trace.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const sp = req.nextUrl.searchParams;
    const campaignId = sp.get("campaignId");
    if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

    const take = Math.min(Math.max(Number(sp.get("take")) || 100, 1), 300);

    const [prospects, total] = await Promise.all([
      db.prospectCompany.findMany({
        where: { campaignId },
        orderBy: [{ score: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }],
        take,
        select: {
          id: true, name: true, website: true, domain: true, industry: true,
          phone: true, address: true, city: true, country: true,
          score: true, tier: true, status: true, rejectReason: true, source: true,
          _count: { select: { contacts: true } },
        },
      }),
      db.prospectCompany.count({ where: { campaignId } }),
    ]);

    return NextResponse.json({
      total,
      prospects: prospects.map(({ _count, ...p }: any) => ({ ...p, contactCount: _count.contacts })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
