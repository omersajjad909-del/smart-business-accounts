/**
 * Manufacturing → inventory + ledger.
 *
 * The manufacturing screens used to be a production notepad: BOMs, orders and
 * material lists lived in BusinessRecord JSON and touched nothing else. Marking
 * an order complete moved no stock and posted no entry, so the Raw Material
 * Stock / Work In Progress / Finished Goods accounts that businessModules seeds
 * for a factory stayed at zero forever and BOM cost was a number somebody typed.
 *
 * This module is the missing half. Completing a production run:
 *
 *   1. reads the BOM's material lines (real ItemNew rows, with quantities)
 *   2. scales them to the quantity produced
 *   3. issues that material out of stock at its current weighted-average cost
 *   4. receives the finished goods in at the resulting per-unit cost
 *   5. posts the two vouchers that make the accounts agree with the stock:
 *
 *        Dr  Work In Progress        Cr  Raw Material Stock     (issue)
 *        Dr  Finished Goods          Cr  Work In Progress       (receipt)
 *
 * Stock on hand is SUM(InventoryTxn.qty) — inbound positive, outbound negative —
 * which is the convention the rest of the app already uses.
 */

import { prisma } from "@/lib/prisma";
import {
  nextVoucherNo,
  resolveFinishedGoodsAccountId,
  resolveInventoryAccountId,
} from "@/lib/inventoryAccounts";

/**
 * Either the shared client or a transaction handle. Derived from the client we
 * actually use rather than `Prisma.TransactionClient`, which does not accept an
 * extended client — the helpers below run both inside and outside a transaction.
 */
type Db = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/** Chart-of-accounts codes seeded for manufacturing in lib/businessModules.ts. */
export const MFG_ACCOUNTS = {
  RAW_MATERIAL_STOCK: { code: "1200", name: "Raw Material Stock", type: "Asset" },
  WORK_IN_PROGRESS:   { code: "1201", name: "Work In Progress",   type: "Asset" },
  FINISHED_GOODS:     { code: "1202", name: "Finished Goods",     type: "Asset" },
  FACTORY_LABOUR:     { code: "5101", name: "Factory Labour",     type: "Expense" },
  FACTORY_OVERHEAD:   { code: "5102", name: "Manufacturing Overhead", type: "Expense" },
  /**
   * Part-used units sitting on the shop floor — the 0.34 of a roll left over
   * when a run needed 12.66 rolls and 13 whole ones had to come off the rack.
   * It is still the company's material, so it stays an asset instead of being
   * buried in the cost of the batch that happened to open the roll.
   */
  MATERIAL_REMNANTS:  { code: "1203", name: "Material Remnants", type: "Asset" },
} as const;

export const INVENTORY_TXN_TYPES = {
  /** Raw material leaving stock into a production run. */
  PRODUCTION_ISSUE: "PRODUCTION_ISSUE",
  /** Finished goods arriving from a production run. */
  PRODUCTION_RECEIPT: "PRODUCTION_RECEIPT",
} as const;

/**
 * Inbound movements whose `amount` is genuinely what the stock *cost*.
 *
 * Not every positive InventoryTxn is a cost. `SALE_RETURN` rows — written by
 * sales returns and by the reversal legs of invoice edits and deletes — carry
 * the *sale* rate, and `ADJUSTMENT` rows carry `item.rate`, which is also the
 * sale rate. Averaging those in inflated every cost in the system: one return
 * of a bag sold at 20 dragged its 11.25 production cost upwards, and the next
 * production run then issued material at that wrong price.
 */
export const COST_BEARING_INBOUND_TYPES = [
  "PURCHASE",
  "PRODUCTION_RECEIPT",
  "OPENING",
] as const;

export type BomLine = {
  itemId: string;
  qty: number;
  /**
   * Whether a part-used unit of this material survives the run.
   *
   * True for anything cut from a continuous piece — rolls, sheets, fabric: a
   * run that needs 12.66 rolls takes 13 off the rack and the balance of the
   * thirteenth stays usable, so the next small order does not have to open a
   * new one. False (the default, and what every BOM did before) for discrete
   * material like screws, where two thirds of a screw is scrap, not stock.
   */
  divisible?: boolean;
};

export type BomLineCost = BomLine & {
  itemName: string;
  unit: string;
  /** Weighted-average cost per unit, falling back to the item's purchase rate. */
  unitCost: number;
  /** Exact, unrounded quantity the run consumes. */
  exactQty: number;
  /** Whole units that must leave stock — what availability is checked against. */
  requiredQty: number;
  /** Drawn from already-open pieces instead of from stock. */
  fromRemnantQty: number;
  fromRemnantCost: number;
  /** Part of the last whole unit that survives this run as a new open piece. */
  leftoverQty: number;
  leftoverCost: number;
  availableQty: number;
  /** What this line actually charges to the batch — leftover excluded. */
  lineCost: number;
  /** Where this item's stock is, when the chosen warehouse cannot cover the run. */
  elsewhere?: { location: string; qty: number }[];
};

/** One part-used piece of material, held as a BusinessRecord. */
export type RemnantPiece = {
  id: string;
  itemId: string;
  qty: number;
  unitCost: number;
  location: string;
};

/** BusinessRecord category the open pieces live in. */
export const MATERIAL_REMNANT_CATEGORY = "material_remnant";

/** Below this a remnant is float dust, not material. */
const REMNANT_EPSILON = 1e-6;

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const round2 = (n: number) => Math.round(n * 100) / 100;

export class ManufacturingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Reads BOM lines off a BusinessRecord's JSON.
 *
 * BOMs created before this module stored materials as a comma-separated list of
 * names with no quantities — enough to display, not enough to consume. Those
 * still load and still render; they just cannot be produced against until
 * someone adds quantities, which is what `usable` reports.
 */
export function readBomLines(data: unknown): { lines: BomLine[]; usable: boolean } {
  const raw = (data as { lines?: unknown })?.lines;
  if (!Array.isArray(raw)) return { lines: [], usable: false };
  const lines: BomLine[] = [];
  for (const entry of raw) {
    const itemId = String((entry as { itemId?: unknown })?.itemId || "").trim();
    const qty = Number((entry as { qty?: unknown })?.qty);
    if (!itemId || !Number.isFinite(qty) || qty <= 0) continue;
    lines.push({
      itemId,
      qty,
      divisible: (entry as { divisible?: unknown })?.divisible === true,
    });
  }
  return { lines, usable: lines.length > 0 };
}

/**
 * Stock on hand per item, in one query rather than one per line.
 *
 * `location` narrows to a single warehouse. Production must consume from the
 * store it is actually drawing on — without this a run could be approved
 * against stock sitting in another warehouse and then drive that warehouse
 * negative.
 */
export async function getStockOnHand(
  tx: Db,
  companyId: string,
  itemIds: string[],
  location?: string | null,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!itemIds.length) return out;
  const rows = await tx.inventoryTxn.groupBy({
    by: ["itemId"],
    where: { companyId, itemId: { in: itemIds }, ...(location ? { location } : {}) },
    _sum: { qty: true },
  });
  for (const r of rows) out.set(r.itemId, r._sum.qty ?? 0);
  for (const id of itemIds) if (!out.has(id)) out.set(id, 0);
  return out;
}

/**
 * Weighted-average cost per unit from inbound movements.
 *
 * Issuing at the item's purchase rate would value the issue at today's price
 * while the stock it came out of was bought at yesterday's, and the difference
 * would silently land in the stock account. Averaging what was actually paid
 * keeps the account and the quantity telling the same story.
 */
export async function getAverageCosts(
  tx: Db,
  companyId: string,
  itemIds: string[],
  location?: string | null,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!itemIds.length) return out;

  const inbound = await tx.inventoryTxn.findMany({
    where: {
      companyId,
      itemId: { in: itemIds },
      qty: { gt: 0 },
      type: { in: [...COST_BEARING_INBOUND_TYPES] },
      ...(location ? { location } : {}),
    },
    select: { itemId: true, qty: true, amount: true },
  });
  const totals = new Map<string, { qty: number; value: number }>();
  for (const row of inbound) {
    const acc = totals.get(row.itemId) || { qty: 0, value: 0 };
    acc.qty += row.qty;
    acc.value += row.amount;
    totals.set(row.itemId, acc);
  }

  // Never received? Fall back to the item's own purchase rate so a brand-new
  // company can still run a costed production order on opening stock.
  const items = await tx.itemNew.findMany({
    where: { companyId, id: { in: itemIds } },
    select: { id: true, purchaseRate: true },
  });
  for (const item of items) {
    const t = totals.get(item.id);
    const avg = t && t.qty > 0 ? t.value / t.qty : item.purchaseRate;
    out.set(item.id, Number.isFinite(avg) && avg > 0 ? avg : 0);
  }
  return out;
}

/**
 * Conversion cost the BOM declares for one batch.
 *
 * Production used to cost material only, so a PVC bag that took a roll plus an
 * hour of labour and machine time was valued at the roll alone. Finished goods
 * went onto the balance sheet too cheap, and the labour stayed in the P&L as a
 * period expense in the month it was paid rather than following the goods.
 */
export function readBomConversion(data: unknown): {
  labourPerBatch: number;
  overheadPerBatch: number;
} {
  const d = (data ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return {
    labourPerBatch: num(d.labourPerBatch),
    overheadPerBatch: num(d.overheadPerBatch),
  };
}

/**
 * Finds a company's account, creating it if the chart predates it.
 *
 * Name is checked before code because the codes are not unique across business
 * types: 5101 is "Factory Labour" in the manufacturing chart but "Purchase
 * Returns" in the trading one, so keying on the code alone would post wages
 * into a purchase-returns account for any company set up as trading.
 */
export async function ensureAccount(
  tx: Db,
  companyId: string,
  spec: { code: string; name: string; type: string },
): Promise<string> {
  const byName = await tx.account.findFirst({
    where: {
      companyId,
      deletedAt: null,
      name: { equals: spec.name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (byName) return byName.id;

  // A company set up as "trading" and later switched to manufacturing has no
  // WIP account. Create it rather than refusing to post — but not on top of a
  // code another account already owns, or the chart ends up with two 5101s
  // meaning different things.
  const codeTaken = await tx.account.findFirst({
    where: { companyId, code: spec.code, deletedAt: null },
    select: { id: true },
  });
  const code = codeTaken ? `${spec.code}-MFG` : spec.code;

  const created = await tx.account.create({
    data: { companyId, code, name: spec.name, type: spec.type },
    select: { id: true },
  });
  return created.id;
}

/**
 * Prices one production run without writing anything — used by the UI to show
 * the cost and the shortages before the user commits.
 */
export async function priceProductionRun(opts: {
  companyId: string;
  bomLines: BomLine[];
  /** Units the BOM produces per batch. */
  bomYield: number;
  /** Units being produced now. */
  producedQty: number;
  /** Conversion cost the BOM declares per batch; scaled like the material. */
  labourPerBatch?: number;
  overheadPerBatch?: number;
  /** Absolute overrides for this run, if the operator entered actuals. */
  labourCost?: number;
  overheadCost?: number;
  /** Warehouse the run draws on. Omit to look at every location. */
  location?: string | null;
  client?: Db;
}): Promise<{
  lines: BomLineCost[];
  materialCost: number;
  labourCost: number;
  overheadCost: number;
  totalCost: number;
  unitCost: number;
  shortages: BomLineCost[];
}> {
  const db = (opts.client ?? prisma) as Db;
  const { companyId, bomLines, producedQty, location } = opts;
  const bomYield = opts.bomYield > 0 ? opts.bomYield : 1;
  const scale = producedQty / bomYield;

  const itemIds = bomLines.map((l) => l.itemId);
  const [items, stock, costs] = await Promise.all([
    db.itemNew.findMany({
      where: { companyId, id: { in: itemIds } },
      select: { id: true, name: true, unit: true },
    }),
    getStockOnHand(db, companyId, itemIds, location),
    getAverageCosts(db, companyId, itemIds, location),
  ]);
  const byId = new Map(items.map((i) => [i.id, i]));

  const lines: BomLineCost[] = bomLines.map((line) => {
    const item = byId.get(line.itemId);
    const unitCost = costs.get(line.itemId) ?? 0;
    // Materials are consumed in whole units — InventoryTxn.qty is an Int, and a
    // half-issued unit is not a thing a storekeeper can hand over.
    const requiredQty = Math.ceil(line.qty * scale);
    return {
      itemId: line.itemId,
      qty: line.qty,
      itemName: item?.name ?? "(deleted item)",
      unit: item?.unit ?? "",
      unitCost,
      requiredQty,
      availableQty: stock.get(line.itemId) ?? 0,
      lineCost: requiredQty * unitCost,
    };
  });

  const materialCost = lines.reduce((s, l) => s + l.lineCost, 0);

  // Conversion cost scales with the run unless the operator gave an actual.
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const labourCost = round2(
    opts.labourCost != null ? Number(opts.labourCost) || 0 : (opts.labourPerBatch || 0) * scale,
  );
  const overheadCost = round2(
    opts.overheadCost != null ? Number(opts.overheadCost) || 0 : (opts.overheadPerBatch || 0) * scale,
  );
  const totalCost = materialCost + labourCost + overheadCost;

  return {
    lines,
    materialCost,
    labourCost,
    overheadCost,
    totalCost,
    unitCost: producedQty > 0 ? totalCost / producedQty : 0,
    shortages: lines.filter((l) => l.availableQty < l.requiredQty),
  };
}

export type CompletedRun = {
  producedQty: number;
  materialCost: number;
  labourCost: number;
  overheadCost: number;
  totalCost: number;
  unitCost: number;
  lines: BomLineCost[];
  issueVoucherNo: string;
  receiptVoucherNo: string;
  batchNo: string;
  finishedItemId: string;
};

/**
 * Records a completed production run: material out, finished goods in, and the
 * two vouchers that keep the ledger level with the stock. All or nothing.
 */
export async function completeProductionRun(opts: {
  companyId: string;
  branchId?: string | null;
  /** BusinessRecord id of the production order. */
  productionOrderId: string;
  /** Units finished in this run. */
  producedQty: number;
  date?: string | Date;
  /** Produce anyway when material is short — the shortfall shows as negative stock. */
  allowNegativeStock?: boolean;
  location?: string;
  /** Actual conversion cost for this run; overrides what the BOM declares. */
  labourCost?: number;
  overheadCost?: number;
}): Promise<CompletedRun> {
  const { companyId, productionOrderId } = opts;
  const producedQty = Math.floor(Number(opts.producedQty));
  if (!Number.isFinite(producedQty) || producedQty <= 0) {
    throw new ManufacturingError("Quantity produced must be a whole number greater than zero");
  }
  const date = opts.date ? new Date(opts.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new ManufacturingError("Invalid date");
  const location = opts.location || "MAIN";

  return prisma.$transaction(async (tx) => {
    const order = await tx.businessRecord.findFirst({
      where: { id: productionOrderId, companyId, category: "production_order" },
    });
    if (!order) throw new ManufacturingError("Production order not found", 404);

    const orderData = (order.data ?? {}) as Record<string, unknown>;
    const orderedQty = Number(orderData.quantity ?? 0);
    const alreadyDone = Number(orderData.completed ?? 0);
    if (orderedQty > 0 && alreadyDone + producedQty > orderedQty) {
      throw new ManufacturingError(
        `Order is for ${orderedQty} units and ${alreadyDone} are already complete — cannot produce ${producedQty} more`,
      );
    }

    const bomId = String(orderData.bomId || "");
    if (!bomId) throw new ManufacturingError("This production order has no BOM attached");
    const bom = await tx.businessRecord.findFirst({
      where: { id: bomId, companyId, category: "bom" },
    });
    if (!bom) throw new ManufacturingError("The BOM this order points at no longer exists", 404);

    const bomData = (bom.data ?? {}) as Record<string, unknown>;
    const { lines: bomLines, usable } = readBomLines(bomData);
    if (!usable) {
      throw new ManufacturingError(
        "This BOM has no material quantities yet — open it and add the items and quantities it consumes",
      );
    }

    const finishedItemId = String(bomData.finishedItemId || "");
    if (!finishedItemId) {
      throw new ManufacturingError("This BOM has no finished product item — open it and pick one");
    }
    const finishedItem = await tx.itemNew.findFirst({
      where: { id: finishedItemId, companyId },
      select: { id: true, name: true },
    });
    if (!finishedItem) throw new ManufacturingError("The BOM's finished product item no longer exists", 404);

    const conversion = readBomConversion(bomData);
    const priced = await priceProductionRun({
      companyId,
      bomLines,
      bomYield: Number(bomData.yield ?? 1),
      producedQty,
      labourPerBatch: conversion.labourPerBatch,
      overheadPerBatch: conversion.overheadPerBatch,
      labourCost: opts.labourCost,
      overheadCost: opts.overheadCost,
      // Material is consumed out of one warehouse, so availability and cost are
      // read from that warehouse rather than from company-wide totals.
      location,
      client: tx,
    });

    if (priced.shortages.length && !opts.allowNegativeStock) {
      const detail = priced.shortages
        .map((s) => `${s.itemName} (need ${s.requiredQty}${s.unit}, have ${s.availableQty}${s.unit})`)
        .join("; ");
      throw new ManufacturingError(`Not enough raw material: ${detail}`);
    }

    // ── 1. Material out of stock ──
    for (const line of priced.lines) {
      if (line.requiredQty <= 0) continue;
      await tx.inventoryTxn.create({
        data: {
          companyId,
          type: INVENTORY_TXN_TYPES.PRODUCTION_ISSUE,
          date,
          itemId: line.itemId,
          qty: -line.requiredQty,
          rate: line.unitCost,
          amount: line.lineCost,
          location,
        },
      });
    }

    // ── 2. Finished goods into stock, valued at what they cost to make ──
    await tx.inventoryTxn.create({
      data: {
        companyId,
        type: INVENTORY_TXN_TYPES.PRODUCTION_RECEIPT,
        date,
        itemId: finishedItemId,
        qty: producedQty,
        rate: priced.unitCost,
        amount: priced.totalCost,
        location,
      },
    });

    // ── 3. The two vouchers ──
    // Raw material is credited out of the account the purchase debited it into.
    // This used to be MFG_ACCOUNTS.RAW_MATERIAL_STOCK (1200) while purchase
    // invoices debit Stock/Inventory, so issuing material drove 1200 negative
    // and left the purchased value stranded in Stock/Inventory forever.
    const [rawMaterialAccountId, wipAccountId, finishedAccountId, labourAccountId, overheadAccountId] =
      await Promise.all([
        resolveInventoryAccountId(tx, companyId),
        ensureAccount(tx, companyId, MFG_ACCOUNTS.WORK_IN_PROGRESS),
        resolveFinishedGoodsAccountId(tx, companyId),
        ensureAccount(tx, companyId, MFG_ACCOUNTS.FACTORY_LABOUR),
        ensureAccount(tx, companyId, MFG_ACCOUNTS.FACTORY_OVERHEAD),
      ]);

    // Was `count() + 1` / `+ 2`, which repeated a number as soon as any MFG
    // voucher was deleted — the count dropped while the highest number did not.
    const nextMfg = await nextVoucherNo(tx, companyId, "MFG", "MFG");
    const orderLabel = String(orderData.orderId || order.title);
    const issueVoucherNo = `MFG-${nextMfg}`;
    const receiptVoucherNo = `MFG-${nextMfg + 1}`;
    const branchId = opts.branchId || null;

    // A zero-cost run (nothing ever received, no purchase rate set) would post a
    // pair of zero vouchers that clutter the ledger and say nothing.
    if (priced.totalCost > 0) {
      await tx.voucher.create({
        data: {
          companyId, branchId,
          voucherNo: issueVoucherNo,
          type: "MFG",
          date,
          narration: `Material and conversion cost charged to production ${orderLabel}`,
          entries: {
            create: [
              // WIP absorbs the full cost of the run …
              { companyId, accountId: wipAccountId, amount: priced.totalCost },
              // … released from stock, and from the labour and overhead the
              // factory already expensed. Crediting those expense accounts is
              // the absorption step: the cost stops being a period expense and
              // follows the goods until they are sold.
              { companyId, accountId: rawMaterialAccountId, amount: -priced.materialCost },
              ...(priced.labourCost > 0
                ? [{ companyId, accountId: labourAccountId, amount: -priced.labourCost }]
                : []),
              ...(priced.overheadCost > 0
                ? [{ companyId, accountId: overheadAccountId, amount: -priced.overheadCost }]
                : []),
            ],
          },
        },
      });

      await tx.voucher.create({
        data: {
          companyId, branchId,
          voucherNo: receiptVoucherNo,
          type: "MFG",
          date,
          narration: `${producedQty} × ${finishedItem.name} received from production ${orderLabel}`,
          entries: {
            create: [
              { companyId, accountId: finishedAccountId, amount: priced.totalCost },
              { companyId, accountId: wipAccountId, amount: -priced.totalCost },
            ],
          },
        },
      });
    }

    // ── 4. Finished goods batch ──
    const batchCount = await tx.businessRecord.count({
      where: { companyId, category: "finished_good_batch" },
    });
    const batchNo = `FG-${String(batchCount + 1).padStart(4, "0")}`;
    await tx.businessRecord.create({
      data: {
        companyId,
        branchId,
        category: "finished_good_batch",
        title: finishedItem.name,
        status: "available",
        refId: order.id,
        date,
        amount: priced.totalCost,
        data: {
          batchNo,
          quantity: producedQty,
          warehouse: location,
          productionOrderId: orderLabel,
          itemId: finishedItemId,
          unitCost: priced.unitCost,
        },
      },
    });

    // ── 5. Move the order along ──
    const completed = alreadyDone + producedQty;
    await tx.businessRecord.update({
      where: { id: order.id },
      data: {
        status: orderedQty > 0 && completed >= orderedQty ? "completed" : "running",
        data: {
          ...orderData,
          completed,
          lastRunAt: date.toISOString(),
          lastRunCost: priced.totalCost,
        },
      },
    });

    return {
      producedQty,
      materialCost: priced.materialCost,
      labourCost: priced.labourCost,
      overheadCost: priced.overheadCost,
      totalCost: priced.totalCost,
      unitCost: priced.unitCost,
      lines: priced.lines,
      issueVoucherNo,
      receiptVoucherNo,
      batchNo,
      finishedItemId,
    };
  });
}
