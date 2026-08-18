import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { advanceCampaign } from "@/lib/prospecting/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Advances a campaign by one batch, or by several if `batches` is given.
 *
 * Kept as an explicit admin-triggered call rather than a background job so
 * that a run only ever happens because someone asked for it — discovery and
 * enrichment both cost money per row.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const batches = Math.min(Math.max(Number(body.batches) || 1, 1), 10);

    const results = [];
    for (let i = 0; i < batches; i++) {
      const result = await advanceCampaign(id);
      results.push(result);
      // Stop as soon as the campaign reaches the human gate.
      if (result.status === "review" || result.status === "paused" || result.status === "failed") break;
    }

    const last = results[results.length - 1];
    return NextResponse.json({
      status: last.status,
      results,
      message: results.map((r) => r.message).join(" | "),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
