// FILE: lib/jobWorkAmend.ts
//
// Undoing and changing an issue challan.
//
// Issuing material to a job worker writes in three places: two stock rows per
// line (out of the warehouse, in at the worker), a voucher moving the value
// from Inventory to Stock at Job Worker, and the challan record itself. So
// "delete this challan" cannot be a row deletion — that would leave the
// material stranded at the worker's location for good and a voucher in the
// ledger with no document behind it, both silently.
//
// Two operations instead, and both of them reverse rather than erase:
//
//   cancel — every issued line comes home, the value goes back to Inventory,
//            and the challan is marked cancelled and kept.
//   amend  — the issued quantities change and only the difference moves. Cut
//            13 rolls to 7 and six come back on the spot; raise it and more
//            goes out, against the same stock check the original passed.
//
// Neither is allowed once a receipt has posted against the challan. A receipt
// has already consumed material, valued finished pieces into stock and raised
// a payable; pulling the issue out from under it would leave the receipt
// costed against material the challan no longer says went out.

import { prisma } from "@/lib/prisma";
import { nextVoucherNo, resolveInventoryAccountId, type Db } from "@/lib/inventoryAccounts";
import { ensureAccount, getAverageCosts, getStockOnHand } from "@/lib/manufacturingPosting";
import { round2, round6 } from "@/lib/manufacturingRemnants";
import {
  JOB_WORK_ACCOUNTS,
  JOB_WORK_CATEGORIES,
  JOB_WORK_TXN_TYPES,
  JobWorkError,
  assertJobWorkEnabled,
  type JobWorkChallanLine,
} from "@/lib/jobWork";

/**
 * The rule both operations turn on.
 *
 * Deliberately refuses rather than half-doing it: there is no way to reverse a
 * receipt yet, so a challan that has one is out of reach here and the message
 * says what to do instead.
 */
function assertUntouched(
  record: { status: string; data: unknown },
  lines: JobWorkChallanLine[],
  verb: string,
): void {
  if (record.status === "cancelled") throw new JobWorkError("This challan is already cancelled");
  if (record.status === "closed") throw new JobWorkError(`A closed challan cannot be ${verb}`);

  const data = (record.data ?? {}) as Record<string, unknown>;
  const received = Number(data.receivedQty) || 0;
  const moved = lines.some((l) => l.consumedQty > 1e-9 || l.returnedQty > 1e-9);
  if (received > 0 || moved) {
    throw new JobWorkError(
      `This challan already has a receipt against it, so it cannot be ${verb}. ` +
      `Issue a fresh challan for the difference instead.`,
    );
  }
}

/** Loads a challan with everything a reversal needs, or explains what is missing. */
async function loadChallanForWrite(
  tx: Db,
  companyId: string,
  challanId: string,
) {
  const record = await tx.businessRecord.findFirst({
    where: { id: challanId, companyId, category: JOB_WORK_CATEGORIES.CHALLAN },
  });
  if (!record) throw new JobWorkError("Challan not found", 404);

  const data = (record.data ?? {}) as Record<string, unknown>;
  const lines = (Array.isArray(data.lines) ? data.lines : []) as JobWorkChallanLine[];
  const sourceLocation = String(data.sourceLocation || "MAIN").trim() || "MAIN";
  const jobLocation = String(data.jobLocation || "").trim();
  if (!jobLocation) throw new JobWorkError("This challan has no job worker location recorded");

  return { record, data, lines, sourceLocation, jobLocation };
}

/**
 * Moves material between the warehouse and the worker, and writes the one
 * ledger entry that follows it.
 *
 * Positive `qty` sends material out, negative brings it home — the same pair
 * of stock rows with the signs swapped. The voucher is written once against
 * the net, so an amendment that cuts one item and raises another lands as a
 * single entry rather than two that have to be read together.
 */
async function moveJobMaterial(
  tx: Db,
  opts: {
    companyId: string;
    branchId?: string | null;
    date: Date;
    sourceLocation: string;
    jobLocation: string;
    partyId: string | null;
    narration: string;
    moves: { itemId: string; qty: number; unitCost: number }[];
  },
): Promise<{ voucherNo: string; netValue: number }> {
  const { companyId, date, sourceLocation, jobLocation, partyId } = opts;
  let netValue = 0;

  for (const move of opts.moves) {
    if (Math.abs(move.qty) < 1e-9) continue;

    const out = move.qty > 0;                       // leaving the warehouse
    const qty = Math.abs(move.qty);
    const amount = round2(qty * move.unitCost);
    netValue += out ? amount : -amount;

    await tx.inventoryTxn.create({
      data: {
        companyId, date, itemId: move.itemId, rate: move.unitCost, amount, partyId,
        type: out ? JOB_WORK_TXN_TYPES.ISSUE_OUT : JOB_WORK_TXN_TYPES.RETURN_IN,
        qty: out ? -qty : qty,
        location: sourceLocation,
      },
    });
    await tx.inventoryTxn.create({
      data: {
        companyId, date, itemId: move.itemId, rate: move.unitCost, amount, partyId,
        type: out ? JOB_WORK_TXN_TYPES.ISSUE_IN : JOB_WORK_TXN_TYPES.RETURN_OUT,
        qty: out ? qty : -qty,
        location: jobLocation,
      },
    });
  }

  netValue = round2(netValue);
  // Nothing worth a rupee moved — a voucher for zero is noise in the ledger.
  if (Math.abs(netValue) < 0.005) return { voucherNo: "", netValue: 0 };

  const [atWorkerAccountId, inventoryAccountId] = await Promise.all([
    ensureAccount(tx, companyId, JOB_WORK_ACCOUNTS.STOCK_AT_JOB_WORKER),
    resolveInventoryAccountId(tx, companyId),
  ]);
  const voucherNo = `JW-${await nextVoucherNo(tx, companyId, "JW", "JW")}`;

  await tx.voucher.create({
    data: {
      companyId,
      branchId: opts.branchId || null,
      voucherNo,
      type: "JW",
      date,
      narration: opts.narration,
      entries: {
        create: [
          { companyId, accountId: atWorkerAccountId, amount: netValue },
          { companyId, accountId: inventoryAccountId, amount: -netValue },
        ],
      },
    },
  });

  return { voucherNo, netValue };
}

/** The job worker's own ledger account, so the stock rows name a party. */
async function workerPartyId(
  tx: Db,
  companyId: string,
  workerId: string,
): Promise<string | null> {
  if (!workerId) return null;
  const worker = await tx.businessRecord.findFirst({
    where: { id: workerId, companyId, category: JOB_WORK_CATEGORIES.WORKER },
    select: { data: true },
  });
  const data = (worker?.data ?? {}) as Record<string, unknown>;
  return String(data.accountId || "") || null;
}

export type CancelResult = {
  challanNo: string;
  voucherNo: string;
  /** What came back, at the cost it went out at. */
  returnedValue: number;
};

/**
 * Cancel a challan: every issued line comes home and the ledger entry is
 * reversed.
 *
 * The record is kept and marked `cancelled` rather than deleted. A document
 * that moved stock and posted a voucher is a fact; so is its reversal. A
 * trial balance carrying a cancelled document reads correctly, one carrying an
 * entry whose document has vanished does not.
 */
export async function cancelChallan(opts: {
  companyId: string;
  challanId: string;
  branchId?: string | null;
  reason?: string;
  date?: string;
}): Promise<CancelResult> {
  const { companyId } = opts;
  await assertJobWorkEnabled(companyId);

  const date = opts.date ? new Date(opts.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new JobWorkError("Invalid date");

  return prisma.$transaction(async (tx) => {
    const { record, data, lines, sourceLocation, jobLocation } =
      await loadChallanForWrite(tx, companyId, opts.challanId);
    assertUntouched(record, lines, "cancelled");

    const challanNo = String(data.challanNo || record.title);
    const partyId = await workerPartyId(tx, companyId, String(data.workerId || ""));

    const { voucherNo, netValue } = await moveJobMaterial(tx, {
      companyId, branchId: opts.branchId, date, sourceLocation, jobLocation, partyId,
      narration: `${challanNo} — cancelled, material returned from ${data.workerName || "job worker"}`,
      moves: lines.map((l) => ({ itemId: l.itemId, qty: -l.issuedQty, unitCost: l.unitCost })),
    });

    await tx.businessRecord.update({
      where: { id: record.id },
      data: {
        status: "cancelled",
        amount: 0,
        data: {
          ...data,
          // issuedQty stays on the line. What went out happened; the return
          // rows written above are what brought it back.
          cancelledAt: date.toISOString(),
          cancelReason: String(opts.reason || "").slice(0, 300),
          cancelVoucherNo: voucherNo,
        },
      },
    });

    return { challanNo, voucherNo, returnedValue: round2(-netValue) };
  }, { timeout: 20000 });
}

export type AmendResult = {
  challanNo: string;
  voucherNo: string;
  /** Positive when more went out, negative when material came home. */
  netValue: number;
  totalValue: number;
};

/**
 * Change what a challan issued. Only the difference moves.
 *
 * A line cut from 13 to 7 sends six back; raised, it sends more out against
 * the same stock check the original issue passed. A line dropped entirely
 * returns in full. An item that was not on the challan is priced at today's
 * average cost, because that is what is leaving the warehouse now — the lines
 * already on it keep the cost they were issued at, or an edit to the roll
 * count would quietly revalue the buttons beside it.
 */
export async function amendChallan(opts: {
  companyId: string;
  challanId: string;
  branchId?: string | null;
  lines: { itemId: string; qty: number; standardPerPc?: number }[];
  expectedQty?: number;
  ratePerPc?: number;
  allowedWastagePct?: number;
  notes?: string;
  date?: string;
  allowNegativeStock?: boolean;
}): Promise<AmendResult> {
  const { companyId } = opts;
  await assertJobWorkEnabled(companyId);

  const date = opts.date ? new Date(opts.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new JobWorkError("Invalid date");

  const wanted = (opts.lines || [])
    .map((l) => ({
      itemId: String(l.itemId || "").trim(),
      qty: Number(l.qty),
      standardPerPc: Number(l.standardPerPc),
    }))
    .filter((l) => l.itemId && Number.isFinite(l.qty) && l.qty > 0);
  if (!wanted.length) {
    throw new JobWorkError("A challan needs at least one material line — cancel it instead");
  }

  return prisma.$transaction(async (tx) => {
    const { record, data, lines, sourceLocation, jobLocation } =
      await loadChallanForWrite(tx, companyId, opts.challanId);
    assertUntouched(record, lines, "edited");

    const challanNo = String(data.challanNo || record.title);
    const partyId = await workerPartyId(tx, companyId, String(data.workerId || ""));

    const before = new Map(lines.map((l) => [l.itemId, l]));
    const addedIds = [...new Set(wanted.map((l) => l.itemId))].filter((id) => !before.has(id));

    const items = addedIds.length
      ? await tx.itemNew.findMany({
          where: { companyId, id: { in: addedIds }, deletedAt: null },
          select: { id: true, name: true, unit: true },
        })
      : [];
    if (items.length !== addedIds.length) throw new JobWorkError("One or more items no longer exist", 404);
    const itemById = new Map(items.map((i) => [i.id, i]));
    const costs = addedIds.length
      ? await getAverageCosts(tx, companyId, addedIds, sourceLocation)
      : new Map<string, number>();

    const next: JobWorkChallanLine[] = wanted.map((l) => {
      const old = before.get(l.itemId);
      const item = itemById.get(l.itemId);
      const std = Number.isFinite(l.standardPerPc) && l.standardPerPc > 0
        ? l.standardPerPc
        : old?.standardPerPc;
      return {
        itemId: l.itemId,
        itemName: old?.itemName ?? item?.name ?? "",
        unit: old?.unit ?? item?.unit ?? "",
        issuedQty: round6(l.qty),
        unitCost: old?.unitCost ?? round2(costs.get(l.itemId) ?? 0),
        ...(std ? { standardPerPc: std } : {}),
        consumedQty: 0,
        returnedQty: 0,
      };
    });

    // Every item on either side of the change, so a line dropped from the
    // challan is not simply forgotten with its material still at the worker.
    const afterById = new Map(next.map((l) => [l.itemId, l]));
    const moves = [...new Set([...before.keys(), ...afterById.keys()])].map((itemId) => ({
      itemId,
      qty: round6((afterById.get(itemId)?.issuedQty ?? 0) - (before.get(itemId)?.issuedQty ?? 0)),
      unitCost: afterById.get(itemId)?.unitCost ?? before.get(itemId)?.unitCost ?? 0,
    }));

    if (!opts.allowNegativeStock) {
      const sending = moves.filter((m) => m.qty > 1e-9);
      if (sending.length) {
        const onHand = await getStockOnHand(tx, companyId, sending.map((m) => m.itemId), sourceLocation);
        const short = sending.filter((m) => (onHand.get(m.itemId) ?? 0) < m.qty);
        if (short.length) {
          const detail = short
            .map((m) => {
              const line = afterById.get(m.itemId);
              const unit = line?.unit ?? "";
              return `${line?.itemName || m.itemId} (need ${m.qty}${unit} more, have ${onHand.get(m.itemId) ?? 0}${unit})`;
            })
            .join("; ");
          throw new JobWorkError(`Not enough material in ${sourceLocation}: ${detail}`);
        }
      }
    }

    const { voucherNo, netValue } = await moveJobMaterial(tx, {
      companyId, branchId: opts.branchId, date, sourceLocation, jobLocation, partyId,
      narration: `${challanNo} — issued quantities amended`,
      moves,
    });

    const totalValue = round2(next.reduce((s, l) => s + l.issuedQty * l.unitCost, 0));
    const history = Array.isArray(data.amendments) ? data.amendments : [];
    const num = (value: unknown, fallback: number) =>
      Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : fallback;

    await tx.businessRecord.update({
      where: { id: record.id },
      data: {
        amount: totalValue,
        data: {
          ...data,
          lines: next,
          expectedQty: Math.floor(num(opts.expectedQty, Number(data.expectedQty) || 0)),
          ratePerPc: num(opts.ratePerPc, Number(data.ratePerPc) || 0),
          allowedWastagePct: num(opts.allowedWastagePct, Number(data.allowedWastagePct) || 0),
          notes: opts.notes != null ? String(opts.notes).slice(0, 500) : String(data.notes || ""),
          // Kept so the ledger movement can be found again from the document.
          // Capped, because a history nobody trims eventually outgrows the row.
          amendments: [...history, { at: date.toISOString(), voucherNo, netValue, totalValue }].slice(-20),
        },
      },
    });

    return { challanNo, voucherNo, netValue, totalValue };
  }, { timeout: 20000 });
}
