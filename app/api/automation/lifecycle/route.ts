export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSequences,
  saveSequence,
  updateSequence,
  deleteSequence,
  enrollCustomer,
  processLifecycleQueue,
  autoTriggerEnrollments,
  getJourneys,
  ensureLifecycleTables,
  LifecycleSequence,
} from "@/lib/customerLifecycle";

// ─── Auth helper ──────────────────────────────────────────────────────────────

function getCompanyId(req: NextRequest): string | null {
  return req.headers.get("x-company-id");
}

// ─── GET ──────────────────────────────────────────────────────────────────────
// GET /api/automation/lifecycle                   → list journeys
// GET /api/automation/lifecycle?action=sequences  → list sequences
// GET /api/automation/lifecycle?action=stats      → stats

export async function GET(req: NextRequest) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Missing x-company-id header" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const status = searchParams.get("status") ?? undefined;

    // ── List sequences ───────────────────────────────────────────────────────
    if (action === "sequences") {
      const sequences = await getSequences(companyId);
      return NextResponse.json({ sequences, count: sequences.length });
    }

    // ── Stats ────────────────────────────────────────────────────────────────
    if (action === "stats") {
      await ensureLifecycleTables();

      const journeys = await getJourneys(companyId);
      const sequences = await getSequences(companyId);

      const byStage: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      for (const j of journeys) {
        byStage[j.stage] = (byStage[j.stage] ?? 0) + 1;
        byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
      }

      return NextResponse.json({
        active: byStatus["active"] ?? 0,
        completed: byStatus["completed"] ?? 0,
        paused: byStatus["paused"] ?? 0,
        cancelled: byStatus["cancelled"] ?? 0,
        sequences: sequences.length,
        byStage,
        total: journeys.length,
      });
    }

    // ── List journeys (default) ───────────────────────────────────────────────
    const journeys = await getJourneys(companyId, status);
    return NextResponse.json({ journeys, count: journeys.length });
  } catch (e: any) {
    console.error("[lifecycle GET]", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
// POST /api/automation/lifecycle?action=create_sequence  → create sequence
// POST /api/automation/lifecycle?action=enroll           → enroll customer
// POST /api/automation/lifecycle?action=process          → process queue
// POST /api/automation/lifecycle?action=auto_trigger     → auto-enroll

export async function POST(req: NextRequest) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Missing x-company-id header" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ── Create sequence ──────────────────────────────────────────────────────
    if (action === "create_sequence") {
      const body = await req.json();
      const { name, stage, steps, active, triggerCondition } = body;

      if (!name || !stage || !steps?.length || !triggerCondition) {
        return NextResponse.json(
          { error: "name, stage, steps, and triggerCondition are required" },
          { status: 400 }
        );
      }

      const sequence = await saveSequence(companyId, {
        name,
        stage,
        steps,
        active: active !== false,
        triggerCondition,
      });

      await prisma.activityLog.create({
        data: {
          action: "LIFECYCLE_SEQUENCE_CREATE",
          companyId,
          details: JSON.stringify({ id: sequence.id, name }),
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, sequence });
    }

    // ── Enroll customer ──────────────────────────────────────────────────────
    if (action === "enroll") {
      const body = await req.json();
      const { customerId, customerName, customerEmail, customerPhone, sequenceId } = body;

      if (!customerId || !customerName || !customerEmail || !sequenceId) {
        return NextResponse.json(
          { error: "customerId, customerName, customerEmail, and sequenceId are required" },
          { status: 400 }
        );
      }

      const journey = await enrollCustomer(companyId, {
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        sequenceId,
      });

      await prisma.activityLog.create({
        data: {
          action: "LIFECYCLE_ENROLL",
          companyId,
          details: JSON.stringify({ journeyId: journey.id, customerId, sequenceId }),
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, journey });
    }

    // ── Process queue (cron) ─────────────────────────────────────────────────
    if (action === "process") {
      const result = await processLifecycleQueue(companyId);

      await prisma.activityLog.create({
        data: {
          action: "LIFECYCLE_PROCESS",
          companyId,
          details: JSON.stringify(result),
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, ...result });
    }

    // ── Auto-trigger enrollments ─────────────────────────────────────────────
    if (action === "auto_trigger") {
      const result = await autoTriggerEnrollments(companyId);

      await prisma.activityLog.create({
        data: {
          action: "LIFECYCLE_AUTO_TRIGGER",
          companyId,
          details: JSON.stringify(result),
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("[lifecycle POST]", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
// PUT /api/automation/lifecycle?action=update_sequence&id=<id>

export async function PUT(req: NextRequest) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Missing x-company-id header" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    if (action === "update_sequence") {
      if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }

      const body = await req.json();
      const updated = await updateSequence(companyId, id, body);

      if (!updated) {
        return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
      }

      await prisma.activityLog.create({
        data: {
          action: "LIFECYCLE_SEQUENCE_UPDATE",
          companyId,
          details: JSON.stringify({ id, ...body }),
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, sequence: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("[lifecycle PUT]", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
// DELETE /api/automation/lifecycle?action=delete_sequence&id=<id>

export async function DELETE(req: NextRequest) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Missing x-company-id header" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    if (action === "delete_sequence") {
      if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }

      await deleteSequence(companyId, id);

      await prisma.activityLog.create({
        data: {
          action: "LIFECYCLE_SEQUENCE_DELETE",
          companyId,
          details: JSON.stringify({ id }),
        },
      }).catch(() => {});

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("[lifecycle DELETE]", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
