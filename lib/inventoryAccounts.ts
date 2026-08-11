// FILE: lib/inventoryAccounts.ts
//
// One place that answers "which ledger account does this stock sit in?".
//
// Before this, purchasing and manufacturing each resolved their own account and
// disagreed: a purchase invoice debited `Stock/Inventory` (INV001), while a
// production run credited `Raw Material Stock` (1200) — an account nothing ever
// debited. So issuing material to production drove 1200 negative and left the
// purchased value stranded in INV001 forever. Sales made it worse by posting no
// cost entry at all, so `Finished Goods` only ever grew.
//
// Every module now resolves through here, so the same physical stock moves
// through the same account whichever screen touched it.

import { prisma } from "@/lib/prisma";

/**
 * The shared client or a transaction handle.
 *
 * Derived from the client we actually use rather than `Prisma.TransactionClient`,
 * which does not accept an extended client. Routes that annotate their handle as
 * `Prisma.TransactionClient` cast to this at the call boundary — the two are the
 * same object at runtime, they just do not unify in the generated types.
 */
export type Db = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export const FINISHED_GOODS_ACCOUNT = { code: "1202", name: "Finished Goods", type: "Asset" };
export const COGS_ACCOUNT = { code: "5150", name: "Cost of Goods Sold", type: "Expense" };

/**
 * The general stock account — where purchases land.
 *
 * The lookup deliberately matches what app/api/purchase-invoice already did
 * (name "Stock/Inventory", or code INV001/INV from the minimal chart seed) so
 * existing books keep posting to the account they always used.
 */
export async function resolveInventoryAccountId(db: Db, companyId: string): Promise<string> {
  const existing = await db.account.findFirst({
    where: {
      companyId,
      deletedAt: null,
      OR: [
        { name: { equals: "Stock/Inventory", mode: "insensitive" } },
        { code: { in: ["INV001", "INV"] } },
      ],
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await db.account.create({
    data: { companyId, code: "INV001", name: "Stock/Inventory", type: "ASSET" },
    select: { id: true },
  });
  return created.id;
}

export async function resolveFinishedGoodsAccountId(db: Db, companyId: string): Promise<string> {
  const existing = await db.account.findFirst({
    where: {
      companyId,
      deletedAt: null,
      OR: [
        { code: FINISHED_GOODS_ACCOUNT.code },
        { name: { equals: FINISHED_GOODS_ACCOUNT.name, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await db.account.create({
    data: {
      companyId,
      code: FINISHED_GOODS_ACCOUNT.code,
      name: FINISHED_GOODS_ACCOUNT.name,
      type: FINISHED_GOODS_ACCOUNT.type,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Where the *cost* of a sold item is released from.
 *
 * A manufactured item was debited to Finished Goods by the production run, so
 * selling it must credit Finished Goods. Anything else was debited to the
 * general stock account by a purchase, so it credits that.
 */
export async function stockAccountIdForCategory(
  db: Db,
  companyId: string,
  category: string | null | undefined,
): Promise<string> {
  return String(category || "").toUpperCase() === "FINISHED"
    ? resolveFinishedGoodsAccountId(db, companyId)
    : resolveInventoryAccountId(db, companyId);
}

/**
 * The expense account cost of sales is charged to.
 *
 * Matched by name first: most business types seed "Cost of Goods Sold" at 5100,
 * but the manufacturing chart uses 5100 for "Raw Material Cost", so keying on
 * the code alone would post cost of sales into a production-cost account.
 */
export async function resolveCogsAccountId(db: Db, companyId: string): Promise<string> {
  const byName = await db.account.findFirst({
    where: {
      companyId,
      deletedAt: null,
      name: { equals: COGS_ACCOUNT.name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (byName) return byName.id;

  const byCode = await db.account.findFirst({
    where: { companyId, deletedAt: null, code: COGS_ACCOUNT.code },
    select: { id: true },
  });
  if (byCode) return byCode.id;

  const created = await db.account.create({
    data: {
      companyId,
      code: COGS_ACCOUNT.code,
      name: COGS_ACCOUNT.name,
      type: COGS_ACCOUNT.type,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Next number in a `PREFIX-n` voucher series.
 *
 * Replaces `count() + 1`, which produced a duplicate the moment any voucher in
 * the series was deleted — the count went down while the highest number stayed.
 * Reads the actual maximum suffix instead.
 *
 * Note: two runs committing simultaneously can still pick the same number under
 * read-committed isolation. A @@unique([companyId, type, voucherNo]) index is
 * the airtight fix and needs a migration.
 */
export async function nextVoucherNo(
  db: Db,
  companyId: string,
  type: string,
  prefix: string,
): Promise<number> {
  const rows = await db.voucher.findMany({
    where: { companyId, type, voucherNo: { startsWith: `${prefix}-` } },
    select: { voucherNo: true },
  });
  let max = 0;
  for (const row of rows) {
    const n = parseInt(row.voucherNo.slice(prefix.length + 1), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}
