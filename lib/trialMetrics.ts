/**
 * What a trial company has actually done, in numbers.
 *
 * "Activated" is the trial's KPI: the customer recorded a real transaction — a
 * sales invoice or a payment receipt — not merely signed up and looked around.
 * Counts come straight from the tables rather than a separate events log, so
 * they cannot drift from what the customer sees in their own app.
 */

import { prisma } from "@/lib/prisma";

const db = prisma as any;

export type TrialActivity = {
  invoices: number;
  receipts: number;
  items: number;
  activated: boolean;
};

const EMPTY: TrialActivity = { invoices: 0, receipts: 0, items: 0, activated: false };

export async function loadTrialActivity(companyIds: string[]): Promise<Map<string, TrialActivity>> {
  const out = new Map<string, TrialActivity>();
  if (companyIds.length === 0) return out;

  const where = { companyId: { in: companyIds } };
  const [invoices, receipts, items] = await Promise.all([
    db.salesInvoice.groupBy({ by: ["companyId"], where, _count: { _all: true } }),
    db.paymentReceipt.groupBy({ by: ["companyId"], where, _count: { _all: true } }),
    db.itemNew.groupBy({ by: ["companyId"], where, _count: { _all: true } }),
  ]);

  const put = (rows: any[], key: "invoices" | "receipts" | "items") => {
    for (const r of rows) {
      const cur = out.get(r.companyId) ?? { ...EMPTY };
      cur[key] = Number(r._count?._all) || 0;
      out.set(r.companyId, cur);
    }
  };
  put(invoices, "invoices");
  put(receipts, "receipts");
  put(items, "items");

  for (const id of companyIds) {
    const a = out.get(id) ?? { ...EMPTY };
    a.activated = a.invoices > 0 || a.receipts > 0;
    out.set(id, a);
  }
  return out;
}
