/**
 * Job work (thekedar / contract manufacturing) → inventory + ledger.
 *
 * The manufacturing module already consumes a BOM and receives finished goods,
 * but it assumes the work happened under the company's own roof: one warehouse,
 * one moment, and conversion cost that lands in a company-wide expense account.
 *
 * A merchant manufacturer does not work that way. They buy the rolls, hand them
 * to a thekedar who owns the machines, and get pieces back days later. Two
 * things break under the in-house model:
 *
 *   1. The material sits with an outside party for a week. Issued straight into
 *      WIP it vanishes from stock, so nobody can answer "thekedar ke paas mera
 *      kitna maal para hai?" — and at year end that material, which is still the
 *      company's asset, is on no report at all.
 *   2. The conversion charge is owed to a *party*. Posted to Factory Labour it
 *      becomes a period expense with nothing to age and nothing to pay off.
 *
 * So the material moves to a location of its own — `JW:<code>`, one per worker —
 * and stays on the books as "Stock at Job Worker" until a receipt consumes it:
 *
 *     issue     Dr  Stock at Job Worker      Cr  Stock/Inventory
 *     receipt   Dr  Work In Progress         Cr  Stock at Job Worker
 *               Dr  Stock/Inventory (returns)    Cr  Job Work Payable — <worker>
 *                                                Cr  Manufacturing Overhead (freight)
 *               Dr  Finished Goods           Cr  Work In Progress
 *
 * Stock on hand stays SUM(InventoryTxn.qty) grouped by location, which is the
 * convention the rest of the app already uses — the job worker is simply another
 * location, so every existing stock report keeps working.
 *
 * ── Availability ────────────────────────────────────────────────────────────
 * Gated to internal test workspaces (`Company.isInternalTest`). Nothing here
 * runs for a demo sandbox or a real customer until that gate is lifted. See
 * `assertJobWorkEnabled`.
 */

import { prisma } from "@/lib/prisma";
import {
  nextVoucherNo,
  resolveFinishedGoodsAccountId,
  resolveInventoryAccountId,
} from "@/lib/inventoryAccounts";
import { MFG_ACCOUNTS, ensureAccount, getAverageCosts, getStockOnHand } from "@/lib/manufacturingPosting";
import { round2, round6 } from "@/lib/manufacturingRemnants";

type Db = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class JobWorkError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** BusinessRecord categories this module owns. No schema migration is involved. */
export const JOB_WORK_CATEGORIES = {
  WORKER: "job_worker",
  CHALLAN: "job_work_challan",
  RECEIPT: "job_work_receipt",
} as const;

/**
 * InventoryTxn.type values written here.
 *
 * `type` is a free String column, so these need no migration and no company
 * without job work will ever hold a row carrying one.
 *
 * Issue and return are written as *pairs* — one row leaving a location, one row
 * arriving at the other — because stock on hand is a sum over a location and a
 * single row would make the material vanish from one side without appearing on
 * the other.
 */
export const JOB_WORK_TXN_TYPES = {
  /** Material leaving the company's own warehouse for the job worker. */
  ISSUE_OUT: "JOB_ISSUE_OUT",
  /** The same material arriving at the job worker's location. */
  ISSUE_IN: "JOB_ISSUE_IN",
  /** Material burnt making the pieces — leaves the job worker's location for good. */
  CONSUME: "JOB_CONSUME",
  /** Unused material leaving the job worker … */
  RETURN_OUT: "JOB_RETURN_OUT",
  /** … and arriving back in the company's warehouse. */
  RETURN_IN: "JOB_RETURN_IN",
  /** Finished pieces received from the job worker, valued at what they cost. */
  RECEIPT: "JOB_RECEIPT",
} as const;

export const JOB_WORK_ACCOUNTS = {
  /**
   * The company's own material, sitting on somebody else's floor. An asset —
   * not an expense, and not the thekedar's stock — until a receipt consumes it.
   */
  STOCK_AT_JOB_WORKER: { code: "1204", name: "Stock at Job Worker", type: "Asset" },
  /**
   * Parent for one payable sub-account per thekedar. Conversion cost is owed to
   * a person, so it must be ageable and payable like any other creditor —
   * which a single "Factory Labour" expense head can never be.
   */
  PAYABLE_PARENT: { code: "JW-PAY", name: "Job Work Payable", type: "Liability" },
} as const;

/* ─────────────────────────── Availability gate ─────────────────────────── */

export async function isJobWorkEnabled(companyId: string): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { isInternalTest: true },
  });
  return company?.isInternalTest === true;
}

/**
 * Every write path calls this first.
 *
 * Deliberately re-reads the company rather than trusting a flag passed down
 * from the caller: this is the only thing standing between an unfinished module
 * and a real customer's books.
 */
export async function assertJobWorkEnabled(companyId: string): Promise<void> {
  if (!(await isJobWorkEnabled(companyId))) {
    throw new JobWorkError(
      "Job Work is only available in an internal test workspace. " +
        "Create one from Admin → Dev Test.",
      403,
    );
  }
}

/* ─────────────────────────── Locations ─────────────────────────── */

/** Sanitised so the value is safe to compare and to show on a stock report. */
export function jobWorkerCode(raw: string): string {
  return (
    String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 12) || "UNKNOWN"
  );
}

export function jobWorkerLocation(code: string): string {
  return `JW:${jobWorkerCode(code)}`;
}

export function isJobWorkerLocation(location: string | null | undefined): boolean {
  return String(location || "").startsWith("JW:");
}

/* ─────────────────────────── Shapes ─────────────────────────── */

export type JobWorkQtyLine = { itemId: string; qty: number };

/** One material line on a challan, as stored and as returned to the screen. */
export type JobWorkChallanLine = {
  itemId: string;
  itemName: string;
  unit: string;
  /** Sent to the worker. */
  issuedQty: number;
  /** Weighted-average cost at the moment of issue — what the asset is carried at. */
  unitCost: number;
  /**
   * Standard consumption per finished piece, for wastage control. Optional:
   * with one material and no wastage recovery there is nothing to compare
   * against and the whole calculation is skipped.
   */
  standardPerPc?: number;
  consumedQty: number;
  returnedQty: number;
};

export type JobWorkChallan = {
  id: string;
  challanNo: string;
  status: string;
  date: string;
  workerId: string;
  workerName: string;
  workerCode: string;
  sourceLocation: string;
  jobLocation: string;
  finishedItemId: string;
  finishedItemName: string;
  expectedQty: number;
  receivedQty: number;
  ratePerPc: number;
  allowedWastagePct: number;
  notes: string;
  lines: JobWorkChallanLine[];
  /** Value of material still lying with the worker under this challan. */
  balanceValue: number;
};

/* ─────────────────────────── Reading ─────────────────────────── */

function lineOf(raw: unknown): JobWorkChallanLine | null {
  const l = (raw ?? {}) as Record<string, unknown>;
  const itemId = String(l.itemId || "").trim();
  const issuedQty = Number(l.issuedQty);
  if (!itemId || !Number.isFinite(issuedQty) || issuedQty <= 0) return null;
  const standard = Number(l.standardPerPc);
  return {
    itemId,
    itemName: String(l.itemName || ""),
    unit: String(l.unit || ""),
    issuedQty,
    unitCost: Number(l.unitCost) || 0,
    ...(Number.isFinite(standard) && standard > 0 ? { standardPerPc: standard } : {}),
    consumedQty: Number(l.consumedQty) || 0,
    returnedQty: Number(l.returnedQty) || 0,
  };
}

export function readChallan(record: {
  id: string;
  title: string;
  status: string;
  date: Date | null;
  data: unknown;
}): JobWorkChallan {
  const d = (record.data ?? {}) as Record<string, unknown>;
  const lines = Array.isArray(d.lines)
    ? d.lines.map(lineOf).filter((l): l is JobWorkChallanLine => l !== null)
    : [];
  const balanceValue = round2(
    lines.reduce(
      (sum, l) => sum + Math.max(0, l.issuedQty - l.consumedQty - l.returnedQty) * l.unitCost,
      0,
    ),
  );
  return {
    id: record.id,
    challanNo: String(d.challanNo || record.title),
    status: record.status,
    date: record.date ? record.date.toISOString().slice(0, 10) : "",
    workerId: String(d.workerId || ""),
    workerName: String(d.workerName || ""),
    workerCode: String(d.workerCode || ""),
    sourceLocation: String(d.sourceLocation || "MAIN"),
    jobLocation: String(d.jobLocation || ""),
    finishedItemId: String(d.finishedItemId || ""),
    finishedItemName: String(d.finishedItemName || ""),
    expectedQty: Number(d.expectedQty) || 0,
    receivedQty: Number(d.receivedQty) || 0,
    ratePerPc: Number(d.ratePerPc) || 0,
    allowedWastagePct: Number(d.allowedWastagePct) || 0,
    notes: String(d.notes || ""),
    lines,
    balanceValue,
  };
}

/* ─────────────────────────── Issue ─────────────────────────── */

export type IssueResult = {
  challanId: string;
  challanNo: string;
  jobLocation: string;
  voucherNo: string;
  totalValue: number;
  lines: JobWorkChallanLine[];
};

/**
 * Sends material out to a job worker.
 *
 * Not a sale and not a consumption — the value moves sideways from
 * Stock/Inventory into Stock at Job Worker and the quantity moves from the
 * company's warehouse to the worker's location. Nothing is owed to anybody yet.
 */
export async function issueToJobWorker(opts: {
  companyId: string;
  branchId?: string | null;
  workerId: string;
  lines: (JobWorkQtyLine & { standardPerPc?: number })[];
  date?: string | Date;
  sourceLocation?: string;
  finishedItemId?: string;
  expectedQty?: number;
  ratePerPc?: number;
  allowedWastagePct?: number;
  notes?: string;
  /** Send anyway when the warehouse is short — the shortfall shows as negative stock. */
  allowNegativeStock?: boolean;
}): Promise<IssueResult> {
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
  if (!wanted.length) throw new JobWorkError("At least one material line is required");

  const sourceLocation = String(opts.sourceLocation || "MAIN").trim() || "MAIN";
  if (isJobWorkerLocation(sourceLocation)) {
    throw new JobWorkError("Material cannot go straight from one job worker to another — bring it back first");
  }

  return prisma.$transaction(
    async (tx) => {
      const worker = await tx.businessRecord.findFirst({
        where: { id: opts.workerId, companyId, category: JOB_WORK_CATEGORIES.WORKER },
      });
      if (!worker) throw new JobWorkError("Job worker not found", 404);
      const workerData = (worker.data ?? {}) as Record<string, unknown>;
      const code = jobWorkerCode(String(workerData.code || worker.title));
      const jobLocation = jobWorkerLocation(code);

      const itemIds = [...new Set(wanted.map((l) => l.itemId))];
      const items = await tx.itemNew.findMany({
        where: { companyId, id: { in: itemIds }, deletedAt: null },
        select: { id: true, name: true, unit: true },
      });
      if (items.length !== itemIds.length) {
        throw new JobWorkError("One or more items no longer exist", 404);
      }
      const itemById = new Map(items.map((i) => [i.id, i]));

      // Cost and availability are both read at the warehouse the material
      // actually leaves — not company-wide — so a challan can never be priced
      // against stock sitting somewhere else.
      const [costs, onHand] = await Promise.all([
        getAverageCosts(tx, companyId, itemIds, sourceLocation),
        getStockOnHand(tx, companyId, itemIds, sourceLocation),
      ]);

      const lines: JobWorkChallanLine[] = wanted.map((l) => {
        const item = itemById.get(l.itemId)!;
        return {
          itemId: l.itemId,
          itemName: item.name,
          unit: item.unit,
          issuedQty: round6(l.qty),
          unitCost: round2(costs.get(l.itemId) ?? 0),
          ...(Number.isFinite(l.standardPerPc) && l.standardPerPc > 0
            ? { standardPerPc: l.standardPerPc }
            : {}),
          consumedQty: 0,
          returnedQty: 0,
        };
      });

      if (!opts.allowNegativeStock) {
        const short = lines.filter((l) => (onHand.get(l.itemId) ?? 0) < l.issuedQty);
        if (short.length) {
          const detail = short
            .map((l) => `${l.itemName} (need ${l.issuedQty}${l.unit}, have ${onHand.get(l.itemId) ?? 0}${l.unit})`)
            .join("; ");
          throw new JobWorkError(`Not enough material in ${sourceLocation}: ${detail}`);
        }
      }

      const totalValue = round2(lines.reduce((s, l) => s + l.issuedQty * l.unitCost, 0));

      // ── Stock: out of the warehouse, in at the worker ──
      for (const line of lines) {
        const amount = round2(line.issuedQty * line.unitCost);
        await tx.inventoryTxn.create({
          data: {
            companyId,
            type: JOB_WORK_TXN_TYPES.ISSUE_OUT,
            date,
            itemId: line.itemId,
            qty: -line.issuedQty,
            rate: line.unitCost,
            amount,
            location: sourceLocation,
            partyId: String(workerData.accountId || "") || null,
          },
        });
        await tx.inventoryTxn.create({
          data: {
            companyId,
            type: JOB_WORK_TXN_TYPES.ISSUE_IN,
            date,
            itemId: line.itemId,
            qty: line.issuedQty,
            rate: line.unitCost,
            amount,
            location: jobLocation,
            partyId: String(workerData.accountId || "") || null,
          },
        });
      }

      const challanNo = await nextDocNo(tx, companyId, JOB_WORK_CATEGORIES.CHALLAN, "JW-OUT");

      // ── Ledger: the asset changes shelf, not owner ──
      let voucherNo = "";
      if (totalValue > 0) {
        const [atWorkerAccountId, inventoryAccountId] = await Promise.all([
          ensureAccount(tx, companyId, JOB_WORK_ACCOUNTS.STOCK_AT_JOB_WORKER),
          resolveInventoryAccountId(tx, companyId),
        ]);
        const next = await nextVoucherNo(tx, companyId, "JW", "JW");
        voucherNo = `JW-${next}`;
        await tx.voucher.create({
          data: {
            companyId,
            branchId: opts.branchId || null,
            voucherNo,
            type: "JW",
            date,
            narration: `${challanNo} — material issued to ${worker.title} (job work, not a sale)`,
            entries: {
              create: [
                { companyId, accountId: atWorkerAccountId, amount: totalValue },
                { companyId, accountId: inventoryAccountId, amount: -totalValue },
              ],
            },
          },
        });
      }

      const finishedItem = opts.finishedItemId
        ? await tx.itemNew.findFirst({
            where: { id: opts.finishedItemId, companyId, deletedAt: null },
            select: { id: true, name: true },
          })
        : null;

      const challan = await tx.businessRecord.create({
        data: {
          companyId,
          branchId: opts.branchId || null,
          category: JOB_WORK_CATEGORIES.CHALLAN,
          title: challanNo,
          status: "open",
          refId: worker.id,
          date,
          amount: totalValue,
          data: {
            challanNo,
            workerId: worker.id,
            workerName: worker.title,
            workerCode: code,
            sourceLocation,
            jobLocation,
            finishedItemId: finishedItem?.id || "",
            finishedItemName: finishedItem?.name || "",
            expectedQty: Number(opts.expectedQty) > 0 ? Math.floor(Number(opts.expectedQty)) : 0,
            receivedQty: 0,
            ratePerPc: Number(opts.ratePerPc) > 0 ? Number(opts.ratePerPc) : Number(workerData.defaultRatePerPc) || 0,
            allowedWastagePct:
              Number(opts.allowedWastagePct) >= 0 && Number.isFinite(Number(opts.allowedWastagePct))
                ? Number(opts.allowedWastagePct)
                : Number(workerData.allowedWastagePct) || 0,
            notes: String(opts.notes || "").slice(0, 500),
            issueVoucherNo: voucherNo,
            lines,
          },
        },
      });

      return { challanId: challan.id, challanNo, jobLocation, voucherNo, totalValue, lines };
    },
    { timeout: 30_000, maxWait: 15_000 },
  );
}

/* ─────────────────────────── Receipt ─────────────────────────── */

export type PricedReceipt = {
  goodQty: number;
  consumed: { itemId: string; itemName: string; unit: string; qty: number; unitCost: number; value: number }[];
  returned: { itemId: string; itemName: string; unit: string; qty: number; unitCost: number; value: number }[];
  materialCost: number;
  returnedValue: number;
  /** Standard vs actual, per material, when the challan carries a standard. */
  wastage: {
    itemId: string;
    itemName: string;
    unit: string;
    standardQty: number;
    actualQty: number;
    wastageQty: number;
    allowedQty: number;
    excessQty: number;
    recovery: number;
  }[];
  jobCharges: number;
  wastageRecovery: number;
  /** What the thekedar is actually owed for this receipt. */
  netPayable: number;
  freight: number;
  totalCost: number;
  unitCost: number;
  /** Lines where the worker is being asked to give back more than he holds. */
  shortages: { itemName: string; asked: number; balance: number; unit: string }[];
};

function balanceOf(line: JobWorkChallanLine): number {
  return round6(line.issuedQty - line.consumedQty - line.returnedQty);
}

/**
 * Works out what a receipt costs without writing anything, so the screen can
 * show the per-piece cost and any wastage recovery before it is committed.
 */
export function priceJobWorkReceipt(opts: {
  challan: JobWorkChallan;
  goodQty: number;
  /** Actual material burnt. Omit a line and the whole outstanding balance is assumed consumed. */
  consumed?: JobWorkQtyLine[];
  /** Unused material coming back to the warehouse. */
  returned?: JobWorkQtyLine[];
  /** Overrides rate × qty when the thekedar's bill says something else. */
  jobCharges?: number;
  freight?: number;
}): PricedReceipt {
  const goodQty = Math.floor(Number(opts.goodQty));
  if (!Number.isFinite(goodQty) || goodQty <= 0) {
    throw new JobWorkError("Quantity received must be greater than zero");
  }

  const askedConsume = new Map<string, number>();
  const askedReturn = new Map<string, number>();
  for (const c of opts.consumed || []) {
    const q = Number(c.qty);
    if (c.itemId && Number.isFinite(q) && q > 0) askedConsume.set(c.itemId, round6(q));
  }
  for (const r of opts.returned || []) {
    const q = Number(r.qty);
    if (r.itemId && Number.isFinite(q) && q > 0) askedReturn.set(r.itemId, round6(q));
  }

  const consumed: PricedReceipt["consumed"] = [];
  const returned: PricedReceipt["returned"] = [];
  const wastage: PricedReceipt["wastage"] = [];
  const shortages: PricedReceipt["shortages"] = [];

  for (const line of opts.challan.lines) {
    const balance = balanceOf(line);
    const ret = askedReturn.get(line.itemId) ?? 0;
    // What to assume when the operator says nothing about consumption.
    //
    // "Everything left was burnt" is wrong, and expensively so. A job needing
    // 12.5 rolls has 13 whole rolls sent out, because half a roll cannot leave
    // the rack; the balance of the thirteenth is good material that is still
    // on the worker's floor. Consuming it silently buried its cost in this
    // batch — the per-piece cost came out too high, and the roll then vanished
    // from every report even though it physically exists.
    //
    // So when the line declares a standard, that standard is the assumption:
    // consume what the pieces should have taken and leave the rest showing as
    // a balance the worker still holds. Real over-consumption is then a number
    // somebody types, which is exactly when it should be charged back.
    //
    // With no standard there is nothing to reason from, and finishing the
    // material stays the assumption it always was.
    const standardCon =
      line.standardPerPc && line.standardPerPc > 0
        ? round6(line.standardPerPc * goodQty)
        : null;
    const con = askedConsume.has(line.itemId)
      ? askedConsume.get(line.itemId)!
      : standardCon !== null
        ? round6(Math.min(standardCon, Math.max(0, balance - ret)))
        : round6(Math.max(0, balance - ret));

    if (round6(con + ret) > balance + 1e-6) {
      shortages.push({ itemName: line.itemName, asked: round6(con + ret), balance, unit: line.unit });
    }

    if (con > 0) {
      consumed.push({
        itemId: line.itemId,
        itemName: line.itemName,
        unit: line.unit,
        qty: con,
        unitCost: line.unitCost,
        value: round2(con * line.unitCost),
      });
    }
    if (ret > 0) {
      returned.push({
        itemId: line.itemId,
        itemName: line.itemName,
        unit: line.unit,
        qty: ret,
        unitCost: line.unitCost,
        value: round2(ret * line.unitCost),
      });
    }

    // Wastage only means something against a declared standard. Without one
    // there is no basis to recover anything and the calculation is skipped —
    // which is the honest answer for a single-material job with no contract.
    if (line.standardPerPc && line.standardPerPc > 0 && con > 0) {
      const standardQty = round6(line.standardPerPc * goodQty);
      const wastageQty = round6(Math.max(0, con - standardQty));
      const allowedQty = round6((standardQty * opts.challan.allowedWastagePct) / 100);
      const excessQty = round6(Math.max(0, wastageQty - allowedQty));
      wastage.push({
        itemId: line.itemId,
        itemName: line.itemName,
        unit: line.unit,
        standardQty,
        actualQty: con,
        wastageQty,
        allowedQty,
        excessQty,
        recovery: round2(excessQty * line.unitCost),
      });
    }
  }

  const materialCost = round2(consumed.reduce((s, c) => s + c.value, 0));
  const returnedValue = round2(returned.reduce((s, r) => s + r.value, 0));
  const jobCharges =
    opts.jobCharges != null && Number.isFinite(Number(opts.jobCharges))
      ? round2(Math.max(0, Number(opts.jobCharges)))
      : round2(goodQty * opts.challan.ratePerPc);
  const wastageRecovery = round2(wastage.reduce((s, w) => s + w.recovery, 0));
  // Recovery can never exceed the bill — the balance would have to be claimed
  // separately, and silently turning the payable negative would look like the
  // thekedar owes money he was never charged.
  const netPayable = round2(Math.max(0, jobCharges - wastageRecovery));
  const freight = round2(Math.max(0, Number(opts.freight) || 0));
  const totalCost = round2(materialCost + netPayable + freight);

  return {
    goodQty,
    consumed,
    returned,
    materialCost,
    returnedValue,
    wastage,
    jobCharges,
    wastageRecovery,
    netPayable,
    freight,
    totalCost,
    unitCost: goodQty > 0 ? round2(totalCost / goodQty) : 0,
    shortages,
  };
}

export type ReceiptResult = PricedReceipt & {
  receiptId: string;
  receiptNo: string;
  chargeVoucherNo: string;
  receiptVoucherNo: string;
  challanStatus: string;
};

/**
 * Takes finished pieces back from a job worker.
 *
 * One document does three things, exactly as the paper one does: burns the
 * material that went into the pieces, brings the pieces in at what they cost,
 * and puts what is owed on the thekedar's own ledger — less any wastage he is
 * being charged for.
 */
export async function receiveFromJobWorker(opts: {
  companyId: string;
  branchId?: string | null;
  challanId: string;
  goodQty: number;
  consumed?: JobWorkQtyLine[];
  returned?: JobWorkQtyLine[];
  jobCharges?: number;
  freight?: number;
  date?: string | Date;
  notes?: string;
}): Promise<ReceiptResult> {
  const { companyId } = opts;
  await assertJobWorkEnabled(companyId);

  const date = opts.date ? new Date(opts.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new JobWorkError("Invalid date");

  return prisma.$transaction(
    async (tx) => {
      const record = await tx.businessRecord.findFirst({
        where: { id: opts.challanId, companyId, category: JOB_WORK_CATEGORIES.CHALLAN },
      });
      if (!record) throw new JobWorkError("Challan not found", 404);
      if (record.status === "closed") {
        throw new JobWorkError("This challan is already closed");
      }
      const challan = readChallan(record);
      if (!challan.finishedItemId) {
        throw new JobWorkError("This challan has no finished item — edit it and pick one");
      }
      const finishedItem = await tx.itemNew.findFirst({
        where: { id: challan.finishedItemId, companyId, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!finishedItem) throw new JobWorkError("The finished item no longer exists", 404);

      const priced = priceJobWorkReceipt({
        challan,
        goodQty: opts.goodQty,
        consumed: opts.consumed,
        returned: opts.returned,
        jobCharges: opts.jobCharges,
        freight: opts.freight,
      });

      if (priced.shortages.length) {
        const detail = priced.shortages
          .map((s) => `${s.itemName} (asked for ${s.asked}${s.unit}, job worker holds ${s.balance}${s.unit})`)
          .join("; ");
        throw new JobWorkError(`The job worker does not hold that much material: ${detail}`);
      }

      const worker = await tx.businessRecord.findFirst({
        where: { id: challan.workerId, companyId, category: JOB_WORK_CATEGORIES.WORKER },
      });
      const workerData = (worker?.data ?? {}) as Record<string, unknown>;
      const workerAccountId = String(workerData.accountId || "");

      // ── 1. Material burnt at the worker's location ──
      for (const c of priced.consumed) {
        await tx.inventoryTxn.create({
          data: {
            companyId,
            type: JOB_WORK_TXN_TYPES.CONSUME,
            date,
            itemId: c.itemId,
            qty: -c.qty,
            rate: c.unitCost,
            amount: c.value,
            location: challan.jobLocation,
            partyId: workerAccountId || null,
          },
        });
      }

      // ── 2. Unused material back on our own shelf ──
      for (const r of priced.returned) {
        await tx.inventoryTxn.create({
          data: {
            companyId,
            type: JOB_WORK_TXN_TYPES.RETURN_OUT,
            date,
            itemId: r.itemId,
            qty: -r.qty,
            rate: r.unitCost,
            amount: r.value,
            location: challan.jobLocation,
            partyId: workerAccountId || null,
          },
        });
        await tx.inventoryTxn.create({
          data: {
            companyId,
            type: JOB_WORK_TXN_TYPES.RETURN_IN,
            date,
            itemId: r.itemId,
            qty: r.qty,
            rate: r.unitCost,
            amount: r.value,
            location: challan.sourceLocation,
            partyId: workerAccountId || null,
          },
        });
      }

      // ── 3. Finished pieces in, valued at what they cost to get made ──
      await tx.inventoryTxn.create({
        data: {
          companyId,
          type: JOB_WORK_TXN_TYPES.RECEIPT,
          date,
          itemId: challan.finishedItemId,
          qty: priced.goodQty,
          rate: priced.unitCost,
          amount: priced.totalCost,
          location: challan.sourceLocation,
          partyId: workerAccountId || null,
        },
      });

      // ── 4. The two vouchers ──
      const [atWorkerAccountId, wipAccountId, finishedAccountId, overheadAccountId, inventoryAccountId] =
        await Promise.all([
          ensureAccount(tx, companyId, JOB_WORK_ACCOUNTS.STOCK_AT_JOB_WORKER),
          ensureAccount(tx, companyId, MFG_ACCOUNTS.WORK_IN_PROGRESS),
          resolveFinishedGoodsAccountId(tx, companyId),
          ensureAccount(tx, companyId, MFG_ACCOUNTS.FACTORY_OVERHEAD),
          resolveInventoryAccountId(tx, companyId),
        ]);

      // The thekedar's own payable. Falls back to the shared parent only when a
      // worker predates the per-worker account — never to an expense head, which
      // is the whole point of this module.
      const payableAccountId =
        priced.netPayable > 0
          ? workerAccountId || (await ensureAccount(tx, companyId, JOB_WORK_ACCOUNTS.PAYABLE_PARENT))
          : "";

      const next = await nextVoucherNo(tx, companyId, "JW", "JW");
      const chargeVoucherNo = `JW-${next}`;
      const receiptVoucherNo = `JW-${next + 1}`;
      const branchId = opts.branchId || null;
      const receiptNo = await nextDocNo(tx, companyId, JOB_WORK_CATEGORIES.RECEIPT, "JW-IN");

      if (priced.totalCost > 0 || priced.returnedValue > 0) {
        await tx.voucher.create({
          data: {
            companyId,
            branchId,
            voucherNo: chargeVoucherNo,
            type: "JW",
            date,
            narration:
              `${receiptNo} — ${priced.goodQty} × ${finishedItem.name} from ${challan.workerName}` +
              (priced.wastageRecovery > 0 ? ` (wastage recovery ${priced.wastageRecovery})` : ""),
            entries: {
              create: [
                // WIP absorbs the full cost of this receipt …
                { companyId, accountId: wipAccountId, amount: priced.totalCost },
                // … and anything the worker sent back lands on our own shelf again.
                ...(priced.returnedValue > 0
                  ? [{ companyId, accountId: inventoryAccountId, amount: priced.returnedValue }]
                  : []),
                // Released by the material that stopped being ours-at-his-place …
                ...(priced.materialCost + priced.returnedValue > 0
                  ? [
                      {
                        companyId,
                        accountId: atWorkerAccountId,
                        amount: -round2(priced.materialCost + priced.returnedValue),
                      },
                    ]
                  : []),
                // … by what he is now owed, net of the wastage charged back …
                ...(priced.netPayable > 0 && payableAccountId
                  ? [{ companyId, accountId: payableAccountId, amount: -priced.netPayable }]
                  : []),
                // … and by the freight the run absorbed.
                ...(priced.freight > 0
                  ? [{ companyId, accountId: overheadAccountId, amount: -priced.freight }]
                  : []),
              ],
            },
          },
        });

        if (priced.totalCost > 0) {
          await tx.voucher.create({
            data: {
              companyId,
              branchId,
              voucherNo: receiptVoucherNo,
              type: "JW",
              date,
              narration: `${priced.goodQty} × ${finishedItem.name} received into stock — ${challan.challanNo}`,
              entries: {
                create: [
                  { companyId, accountId: finishedAccountId, amount: priced.totalCost },
                  { companyId, accountId: wipAccountId, amount: -priced.totalCost },
                ],
              },
            },
          });
        }
      }

      // ── 5. Move the challan along ──
      const consumedByItem = new Map(priced.consumed.map((c) => [c.itemId, c.qty]));
      const returnedByItem = new Map(priced.returned.map((r) => [r.itemId, r.qty]));
      const nextLines = challan.lines.map((l) => ({
        ...l,
        consumedQty: round6(l.consumedQty + (consumedByItem.get(l.itemId) ?? 0)),
        returnedQty: round6(l.returnedQty + (returnedByItem.get(l.itemId) ?? 0)),
      }));
      const anyBalance = nextLines.some((l) => balanceOf(l) > 1e-6);
      const receivedQty = challan.receivedQty + priced.goodQty;
      const challanStatus = anyBalance ? "partial" : "closed";

      const existing = (record.data ?? {}) as Record<string, unknown>;
      await tx.businessRecord.update({
        where: { id: record.id },
        data: {
          status: challanStatus,
          amount: round2(
            nextLines.reduce((s, l) => s + Math.max(0, balanceOf(l)) * l.unitCost, 0),
          ),
          data: { ...existing, lines: nextLines, receivedQty, lastReceiptAt: date.toISOString() },
        },
      });

      const receipt = await tx.businessRecord.create({
        data: {
          companyId,
          branchId,
          category: JOB_WORK_CATEGORIES.RECEIPT,
          title: receiptNo,
          status: "posted",
          refId: record.id,
          date,
          amount: priced.totalCost,
          data: {
            receiptNo,
            challanId: record.id,
            challanNo: challan.challanNo,
            workerId: challan.workerId,
            workerName: challan.workerName,
            finishedItemId: challan.finishedItemId,
            finishedItemName: finishedItem.name,
            goodQty: priced.goodQty,
            consumed: priced.consumed,
            returned: priced.returned,
            wastage: priced.wastage,
            materialCost: priced.materialCost,
            jobCharges: priced.jobCharges,
            wastageRecovery: priced.wastageRecovery,
            netPayable: priced.netPayable,
            freight: priced.freight,
            totalCost: priced.totalCost,
            unitCost: priced.unitCost,
            chargeVoucherNo,
            receiptVoucherNo,
            notes: String(opts.notes || "").slice(0, 500),
          },
        },
      });

      return {
        ...priced,
        receiptId: receipt.id,
        receiptNo,
        chargeVoucherNo,
        receiptVoucherNo,
        challanStatus,
      };
    },
    { timeout: 30_000, maxWait: 15_000 },
  );
}

/* ─────────────────────────── Job worker stock ledger ─────────────────────────── */

export type JobWorkerLedgerRow = {
  workerId: string;
  workerName: string;
  workerCode: string;
  jobLocation: string;
  items: {
    itemId: string;
    itemName: string;
    unit: string;
    issuedQty: number;
    consumedQty: number;
    returnedQty: number;
    balanceQty: number;
    unitCost: number;
    balanceValue: number;
  }[];
  balanceValue: number;
  openChallans: number;
};

/**
 * "Thekedar ke paas mera kitna maal para hai?" — the one report this whole
 * module exists to be able to answer.
 *
 * Quantities come from InventoryTxn (the same sum every other stock report
 * uses) so they cannot drift from stock; the valuation comes from the challans,
 * which carry the cost the material was actually issued at.
 */
export async function readJobWorkerLedger(
  companyId: string,
  workerId?: string,
): Promise<JobWorkerLedgerRow[]> {
  const workers = await prisma.businessRecord.findMany({
    where: {
      companyId,
      category: JOB_WORK_CATEGORIES.WORKER,
      ...(workerId ? { id: workerId } : {}),
    },
    orderBy: { title: "asc" },
  });
  if (!workers.length) return [];

  const challans = await prisma.businessRecord.findMany({
    where: {
      companyId,
      category: JOB_WORK_CATEGORIES.CHALLAN,
      ...(workerId ? { refId: workerId } : {}),
    },
  });
  const parsed = challans.map(readChallan);

  const itemIds = [...new Set(parsed.flatMap((c) => c.lines.map((l) => l.itemId)))];
  const items = itemIds.length
    ? await prisma.itemNew.findMany({
        where: { companyId, id: { in: itemIds } },
        select: { id: true, name: true, unit: true },
      })
    : [];
  const itemById = new Map(items.map((i) => [i.id, i]));

  return workers.map((worker) => {
    const data = (worker.data ?? {}) as Record<string, unknown>;
    const code = jobWorkerCode(String(data.code || worker.title));
    const mine = parsed.filter((c) => c.workerId === worker.id);

    const agg = new Map<
      string,
      { issuedQty: number; consumedQty: number; returnedQty: number; costQty: number; costValue: number }
    >();
    for (const challan of mine) {
      for (const line of challan.lines) {
        const acc =
          agg.get(line.itemId) ||
          { issuedQty: 0, consumedQty: 0, returnedQty: 0, costQty: 0, costValue: 0 };
        acc.issuedQty += line.issuedQty;
        acc.consumedQty += line.consumedQty;
        acc.returnedQty += line.returnedQty;
        // Value the balance at what *this* challan's material cost, so two
        // challans issued at different prices do not average into a number that
        // matches neither.
        const balance = Math.max(0, line.issuedQty - line.consumedQty - line.returnedQty);
        acc.costQty += balance;
        acc.costValue += balance * line.unitCost;
        agg.set(line.itemId, acc);
      }
    }

    const rows = [...agg.entries()]
      .map(([itemId, a]) => {
        const item = itemById.get(itemId);
        const balanceQty = round6(a.issuedQty - a.consumedQty - a.returnedQty);
        return {
          itemId,
          itemName: item?.name || "(deleted item)",
          unit: item?.unit || "",
          issuedQty: round6(a.issuedQty),
          consumedQty: round6(a.consumedQty),
          returnedQty: round6(a.returnedQty),
          balanceQty,
          unitCost: a.costQty > 0 ? round2(a.costValue / a.costQty) : 0,
          balanceValue: round2(a.costValue),
        };
      })
      .filter((r) => r.issuedQty > 0)
      .sort((a, b) => b.balanceValue - a.balanceValue);

    return {
      workerId: worker.id,
      workerName: worker.title,
      workerCode: code,
      jobLocation: jobWorkerLocation(code),
      items: rows,
      balanceValue: round2(rows.reduce((s, r) => s + r.balanceValue, 0)),
      openChallans: mine.filter((c) => c.status !== "closed").length,
    };
  });
}

/* ─────────────────────────── Document numbers ─────────────────────────── */

/**
 * Next number for a document series.
 *
 * Reads the highest suffix actually in use rather than counting rows: a count
 * drops when a record is deleted while the highest number does not, which
 * hands the next document a number that already exists.
 */
async function nextDocNo(db: Db, companyId: string, category: string, prefix: string): Promise<string> {
  const rows = await db.businessRecord.findMany({
    where: { companyId, category, title: { startsWith: `${prefix}-` } },
    select: { title: true },
  });
  let max = 0;
  for (const row of rows) {
    const n = parseInt(row.title.slice(prefix.length + 1), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}
