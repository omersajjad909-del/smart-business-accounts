// FILE: lib/cogsPosting.ts
//
// Cost of sales — the entry that was missing from every sale.
//
// A sales invoice posted only `Dr Customer / Cr Sales`. Stock quantity went
// down, but the value never left the balance sheet: goods that had been sold
// and shipped stayed sitting in Stock/Inventory or Finished Goods, and the P&L
// showed the full sale price as profit because no cost was ever charged.
//
// Every sale now also posts:
//
//     Dr  Cost of Goods Sold      Cr  Finished Goods / Stock-Inventory
//
// valued at the same weighted-average cost manufacturing uses, so a bag that
// cost 11.25 to make is released at 11.25 — not at whatever someone once typed
// into the item's purchase rate.

import { getAverageCosts } from "@/lib/manufacturingPosting";
import {
  resolveCogsAccountId,
  stockAccountIdForCategory,
  type Db,
} from "@/lib/inventoryAccounts";

export type { Db };

/** Voucher type for the cost leg. Kept separate from the SI/SR revenue voucher. */
export const COGS_VOUCHER_TYPE = "COGS";

export type SoldLine = { itemId: string | null | undefined; qty: number };

export type CostedLine = {
  itemId: string;
  qty: number;
  unitCost: number;
  cost: number;
  stockAccountId: string;
};

/**
 * Prices what was sold at weighted-average cost and resolves which stock
 * account each line releases from.
 */
export async function costSoldLines(
  db: Db,
  companyId: string,
  lines: SoldLine[],
): Promise<{ lines: CostedLine[]; total: number }> {
  // One item can appear on several rows of the same invoice.
  const byItem = new Map<string, number>();
  for (const line of lines) {
    const itemId = String(line?.itemId || "").trim();
    const qty = Number(line?.qty);
    if (!itemId || !Number.isFinite(qty) || qty <= 0) continue;
    byItem.set(itemId, (byItem.get(itemId) ?? 0) + qty);
  }
  if (!byItem.size) return { lines: [], total: 0 };

  const itemIds = [...byItem.keys()];
  const [items, costs] = await Promise.all([
    db.itemNew.findMany({
      where: { companyId, id: { in: itemIds } },
      select: { id: true, category: true, purchaseRate: true },
    }),
    getAverageCosts(db, companyId, itemIds),
  ]);
  const byId = new Map(items.map((i) => [i.id, i]));

  // At most two accounts are involved (finished goods, general stock), so they
  // are resolved once and reused rather than queried per line.
  const accountCache = new Map<string, string>();
  const accountFor = async (category: string | null) => {
    const key = String(category || "").toUpperCase() === "FINISHED" ? "FINISHED" : "OTHER";
    const cached = accountCache.get(key);
    if (cached) return cached;
    const id = await stockAccountIdForCategory(db, companyId, category);
    accountCache.set(key, id);
    return id;
  };

  const costed: CostedLine[] = [];
  let total = 0;
  for (const [itemId, qty] of byItem) {
    const item = byId.get(itemId);
    // Services carry no stock and no cost of sales.
    if (!item || String(item.category || "").toUpperCase() === "SERVICE") continue;

    const unitCost = costs.get(itemId) ?? item.purchaseRate ?? 0;
    if (!Number.isFinite(unitCost) || unitCost <= 0) continue;

    const stockAccountId = await accountFor(item.category);
    const cost = unitCost * qty;
    costed.push({ itemId, qty, unitCost, cost, stockAccountId });
    total += cost;
  }

  return { lines: costed, total };
}

/**
 * Writes the cost voucher for a sale.
 *
 * `voucherNo` mirrors the document it belongs to (invoice no, receipt no) so the
 * edit and delete paths can find and drop it exactly the way they already do for
 * the revenue voucher.
 *
 * `direction: "reverse"` flips both legs — used when goods come back in.
 * Returns null when there is nothing to post, so a service-only or zero-cost
 * sale does not litter the ledger with empty vouchers.
 */
export async function postCogsVoucher(
  db: Db,
  opts: {
    companyId: string;
    branchId?: string | null;
    voucherNo: string;
    date: Date;
    lines: SoldLine[];
    narration?: string;
    direction?: "sale" | "reverse";
  },
): Promise<{ voucherId: string; total: number } | null> {
  const { companyId, voucherNo, date } = opts;
  const { lines, total } = await costSoldLines(db, companyId, opts.lines);
  if (!lines.length || total <= 0) return null;

  const sign = opts.direction === "reverse" ? -1 : 1;
  const cogsAccountId = await resolveCogsAccountId(db, companyId);

  // Several lines can share one stock account — merge so the voucher has one
  // entry per account rather than one per item.
  const perAccount = new Map<string, number>();
  for (const line of lines) {
    perAccount.set(line.stockAccountId, (perAccount.get(line.stockAccountId) ?? 0) + line.cost);
  }

  const voucher = await db.voucher.create({
    data: {
      companyId,
      branchId: opts.branchId || null,
      voucherNo,
      type: COGS_VOUCHER_TYPE,
      date,
      narration:
        opts.narration ||
        (sign === 1 ? `Cost of goods sold — ${voucherNo}` : `Cost of goods reversed — ${voucherNo}`),
      entries: {
        create: [
          // Positive = debit, negative = credit, matching the rest of the app.
          { companyId, accountId: cogsAccountId, amount: sign * total },
          ...[...perAccount.entries()].map(([accountId, amount]) => ({
            companyId,
            accountId,
            amount: -sign * amount,
          })),
        ],
      },
    },
    select: { id: true },
  });

  return { voucherId: voucher.id, total };
}

/**
 * Drops the cost voucher attached to a document.
 *
 * Edits and deletes remove the original rather than posting a fresh reversal at
 * today's average — the original entry holds the cost the goods actually left
 * at, and recomputing would leave a residue in the stock account.
 */
export async function removeCogsVoucher(
  db: Db,
  companyId: string,
  voucherNo: string,
): Promise<void> {
  const vouchers = await db.voucher.findMany({
    where: { companyId, voucherNo, type: COGS_VOUCHER_TYPE },
    select: { id: true },
  });
  if (!vouchers.length) return;
  const ids = vouchers.map((v) => v.id);
  await db.voucherEntry.deleteMany({ where: { voucherId: { in: ids } } });
  await db.voucher.deleteMany({ where: { id: { in: ids } } });
}
