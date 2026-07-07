/**
 * app/api/inventory/reorder/route.ts
 *
 * GET  /api/inventory/reorder                    — list all reorder rules
 * GET  /api/inventory/reorder?action=alerts      — items currently below reorder point
 * GET  /api/inventory/reorder?action=history     — reorder history (last 30 days)
 * POST /api/inventory/reorder                    — create / update reorder rule
 * POST /api/inventory/reorder?action=check       — dry-run: what would be reordered
 * POST /api/inventory/reorder?action=process     — trigger reorders now (cron)
 * DELETE /api/inventory/reorder?ruleId=          — delete rule
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import {
  getReorderRules,
  saveReorderRule,
  deleteReorderRule,
  checkAndTriggerReorders,
  getCurrentStock,
  ensureReorderTable,
} from "@/lib/inventoryReorder";

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return apiError("x-company-id header required", 400);

    const url    = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── alerts: items currently below reorder point ─────────────────────────
    if (action === "alerts") {
      await ensureReorderTable();
      const rules = await getReorderRules(companyId);
      const activeRules = rules.filter((r) => r.active);

      const alerts = await Promise.all(
        activeRules.map(async (rule) => {
          const currentStock = await getCurrentStock(companyId, rule.itemId);
          return { ...rule, currentStock, belowReorderPoint: currentStock <= rule.reorderPoint };
        }),
      );

      return apiOk({ alerts: alerts.filter((a) => a.belowReorderPoint) });
    }

    // ── history: last 30 days from ActivityLog ───────────────────────────────
    if (action === "history") {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const rows = await prisma.$queryRaw<Array<{ id: string; details: string; createdAt: string }>>`
        SELECT "id", "details", "createdAt"::text AS "createdAt"
        FROM "ActivityLog"
        WHERE "companyId" = ${companyId}
          AND "action"    IN ('REORDER_PO_DRAFT', 'REORDER_TRIGGERED')
          AND "createdAt" >= ${since}
        ORDER BY "createdAt" DESC
        LIMIT 200
      `;

      const history = rows.map((r) => {
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(r.details); } catch { /* ignore */ }
        return { id: r.id, createdAt: r.createdAt, ...parsed };
      });

      return apiOk({ history });
    }

    // ── default: list all rules ──────────────────────────────────────────────
    const rules = await getReorderRules(companyId);
    return apiOk({ rules });
  } catch (err) {
    console.error("[inventory/reorder GET]", err);
    return apiError("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    const url    = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── check / process — cron or manual trigger ─────────────────────────────
    if (action === "check" || action === "process") {
      if (!companyId) return apiError("x-company-id header required", 400);
      const result = await checkAndTriggerReorders(companyId);

      if (action === "check") {
        // Dry-run: return what would be reordered without actually creating POs
        return apiOk({ ok: true, dryRun: true, ...result });
      }

      return apiOk({ ok: true, ...result });
    }

    // ── create / update rule ─────────────────────────────────────────────────
    if (!companyId) return apiError("x-company-id header required", 400);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const {
      itemId,
      itemName,
      reorderPoint,
      reorderQty,
      preferredSupplierId,
      preferredSupplierName,
      autoCreatePo,
      active,
    } = body as Record<string, unknown>;

    if (!itemId)                          return apiError("itemId is required",      400);
    if (!itemName)                        return apiError("itemName is required",     400);
    if (reorderPoint === undefined || reorderPoint === null)
      return apiError("reorderPoint is required", 400);
    if (reorderQty === undefined || reorderQty === null)
      return apiError("reorderQty is required",   400);

    const rule = await saveReorderRule(companyId, {
      companyId,
      itemId:               String(itemId),
      itemName:             String(itemName),
      reorderPoint:         Number(reorderPoint),
      reorderQty:           Number(reorderQty),
      preferredSupplierId:  preferredSupplierId  ? String(preferredSupplierId)  : undefined,
      preferredSupplierName: preferredSupplierName ? String(preferredSupplierName) : undefined,
      autoCreatePo:         Boolean(autoCreatePo ?? false),
      active:               active !== undefined ? Boolean(active) : true,
    });

    return apiOk({ ok: true, rule }, 201);
  } catch (err) {
    console.error("[inventory/reorder POST]", err);
    return apiError("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return apiError("x-company-id header required", 400);

    const url    = new URL(req.url);
    const ruleId = url.searchParams.get("ruleId");
    if (!ruleId) return apiError("ruleId query param required", 400);

    await deleteReorderRule(ruleId);
    return apiOk({ ok: true, ruleId });
  } catch (err) {
    console.error("[inventory/reorder DELETE]", err);
    return apiError("Internal server error", 500);
  }
}
