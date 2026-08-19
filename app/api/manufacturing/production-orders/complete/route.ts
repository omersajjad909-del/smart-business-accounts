/**
 * POST /api/manufacturing/production-orders/complete
 *
 * Records finished units against a production order: consumes the BOM's raw
 * material out of real stock, receives the finished goods in at cost, and posts
 * the WIP vouchers. See lib/manufacturingPosting.ts for the accounting.
 *
 * GET ?productionOrderId=…&qty=… prices the same run without writing anything,
 * so the screen can show the cost and any shortage before the user commits.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchIdOrDefault } from "@/lib/tenant";
import {
  completeProductionRun,
  priceProductionRun,
  readBomLines,
  readBomConversion,
  ManufacturingError,
} from "@/lib/manufacturingPosting";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const productionOrderId = searchParams.get("productionOrderId") || "";
    const qty = Number(searchParams.get("qty") || 0);
    if (!productionOrderId) {
      return NextResponse.json({ error: "productionOrderId required" }, { status: 400 });
    }

    const order = await prisma.businessRecord.findFirst({
      where: { id: productionOrderId, companyId, category: "production_order" },
    });
    if (!order) return NextResponse.json({ error: "Production order not found" }, { status: 404 });

    const orderData = (order.data ?? {}) as Record<string, unknown>;
    const bomId = String(orderData.bomId || "");
    const bom = bomId
      ? await prisma.businessRecord.findFirst({ where: { id: bomId, companyId, category: "bom" } })
      : null;
    if (!bom) {
      return NextResponse.json({ error: "This production order has no BOM attached" }, { status: 400 });
    }

    const bomData = (bom.data ?? {}) as Record<string, unknown>;
    const { lines, usable } = readBomLines(bomData);
    if (!usable) {
      return NextResponse.json(
        { error: "This BOM has no material quantities yet", needsBomLines: true },
        { status: 400 },
      );
    }

    const ordered = Number(orderData.quantity ?? 0);
    const done = Number(orderData.completed ?? 0);
    const producedQty = qty > 0 ? Math.floor(qty) : Math.max(ordered - done, 1);

    // The quote must price the run exactly the way completing it will, so the
    // screen shows the real cost — conversion cost and warehouse included.
    const conversion = readBomConversion(bomData);
    // Same precedence the posting path uses, so the quote can never price
    // against one warehouse and the run then consume from another.
    const location =
      searchParams.get("location") || String(orderData.location || "").trim() || "MAIN";
    const priced = await priceProductionRun({
      companyId,
      bomLines: lines,
      bomYield: Number(bomData.yield ?? 1),
      producedQty,
      labourPerBatch: conversion.labourPerBatch,
      overheadPerBatch: conversion.overheadPerBatch,
      location,
    });

    return NextResponse.json({
      producedQty,
      remaining: Math.max(ordered - done, 0),
      location,
      ...priced,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to price production run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const branchId = await resolveBranchIdOrDefault(req, companyId);
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

    const result = await completeProductionRun({
      companyId,
      branchId,
      productionOrderId: String(body.productionOrderId || ""),
      producedQty: Number(body.producedQty),
      date: body.date,
      allowNegativeStock: body.allowNegativeStock === true,
      location: body.location,
      // Optional actuals — omit and the BOM's per-batch figures are scaled.
      labourCost: body.labourCost != null ? Number(body.labourCost) : undefined,
      overheadCost: body.overheadCost != null ? Number(body.overheadCost) : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: unknown) {
    if (e instanceof ManufacturingError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed to complete production run";
    console.error("PRODUCTION COMPLETE ERROR:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
