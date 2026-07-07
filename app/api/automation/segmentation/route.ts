export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  processSegmentation,
  getSegments,
  getSegmentStats,
  saveSegmentRules,
  getSegmentRules,
  ensureSegmentTable,
} from "@/lib/customerSegmentation";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { sendWhatsApp } from "@/lib/whatsapp";

// ─── Auth helper ──────────────────────────────────────────────────────────────

function getCompanyId(req: NextRequest): string | null {
  return req.headers.get("x-company-id");
}

// ─── GET ──────────────────────────────────────────────────────────────────────
// GET /api/automation/segmentation                   → all segments with counts
// GET /api/automation/segmentation?segment=vip       → customers in segment
// GET /api/automation/segmentation?action=stats      → stats
// GET /api/automation/segmentation?action=rules      → current rules

export async function GET(req: NextRequest) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Missing x-company-id header" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const segment = searchParams.get("segment");

    // Get rules
    if (action === "rules") {
      const rules = await getSegmentRules(companyId);
      return NextResponse.json({ rules });
    }

    // Stats
    if (action === "stats") {
      const stats = await getSegmentStats(companyId);
      return NextResponse.json(stats);
    }

    // Customers in a specific segment
    if (segment) {
      const customers = await getSegments(companyId, segment);
      return NextResponse.json({ segment, customers, count: customers.length });
    }

    // All segments with customer counts
    await ensureSegmentTable();
    const stats = await getSegmentStats(companyId);
    const allCustomers = await getSegments(companyId);

    return NextResponse.json({
      total: stats.total,
      bySegment: stats.bySegment,
      vipRevenue: stats.vipRevenue,
      atRiskRevenue: stats.atRiskRevenue,
      customers: allCustomers,
    });
  } catch (e: any) {
    console.error("[segmentation GET]", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
// POST /api/automation/segmentation?action=process     → run segmentation
// POST /api/automation/segmentation?action=configure   → save rules
// POST /api/automation/segmentation?action=campaign    → trigger campaign

export async function POST(req: NextRequest) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Missing x-company-id header" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ── Run segmentation ─────────────────────────────────────────────────────
    if (action === "process") {
      const result = await processSegmentation(companyId);

      await prisma.activityLog.create({
        data: {
          action: "SEGMENT_PROCESS",
          companyId,
          details: JSON.stringify(result),
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, ...result });
    }

    // ── Save rules ───────────────────────────────────────────────────────────
    if (action === "configure") {
      const body = await req.json();
      const { vipThreshold, dormantDays, atRiskDays, newCustomerDays } = body;

      await saveSegmentRules(companyId, {
        ...(vipThreshold !== undefined && { vipThreshold: Number(vipThreshold) }),
        ...(dormantDays !== undefined && { dormantDays: Number(dormantDays) }),
        ...(atRiskDays !== undefined && { atRiskDays: Number(atRiskDays) }),
        ...(newCustomerDays !== undefined && { newCustomerDays: Number(newCustomerDays) }),
      });

      return NextResponse.json({ success: true });
    }

    // ── Trigger campaign for a segment ────────────────────────────────────────
    if (action === "campaign") {
      const body = await req.json();
      const { segment, channel, template } = body as {
        segment: string;
        channel: "email" | "sms" | "whatsapp";
        template: string;
      };

      if (!segment || !channel || !template) {
        return NextResponse.json(
          { error: "segment, channel, and template are required" },
          { status: 400 }
        );
      }

      const customers = await getSegments(companyId, segment);
      if (!customers.length) {
        return NextResponse.json({ success: true, sent: 0, skipped: 0, message: "No customers in segment" });
      }

      let sent = 0;
      let skipped = 0;

      for (const customer of customers) {
        const personalised = template
          .replace(/\{\{name\}\}/g, customer.customerName)
          .replace(/\{\{segment\}\}/g, segment);

        if (channel === "email") {
          if (!customer.email) { skipped++; continue; }
          const result = await sendEmail({
            to: customer.email,
            subject: `A message for you, ${customer.customerName}`,
            html: `<p>${personalised.replace(/\n/g, "<br/>")}</p>`,
            companyId,
          });
          if (result.success) sent++; else skipped++;

        } else if (channel === "sms") {
          if (!customer.phone) { skipped++; continue; }
          const result = await sendSms({ to: customer.phone, message: personalised });
          if (result.success) sent++; else skipped++;

        } else if (channel === "whatsapp") {
          if (!customer.phone) { skipped++; continue; }
          const result = await sendWhatsApp(companyId, {
            to: customer.phone,
            type: "text",
            text: personalised,
          });
          if (result.success) sent++; else skipped++;
        }
      }

      await prisma.activityLog.create({
        data: {
          action: "SEGMENT_CAMPAIGN",
          companyId,
          details: JSON.stringify({ segment, channel, sent, skipped, template }),
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, sent, skipped, total: customers.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("[segmentation POST]", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
