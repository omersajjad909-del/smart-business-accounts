import { prisma } from "@/lib/prisma";

export type LateRule = { type: "NONE" | "FLAT" | "PER_DAY"; amount: number; graceDays: number; cap: number; dueDay: number };

export async function getLateRule(companyId: string): Promise<LateRule> {
  const s = await prisma.schoolSettings.findUnique({ where: { companyId }, select: { lateFeeType: true, lateFeeAmount: true, lateFeeGraceDays: true, lateFeeCap: true, feeDueDay: true } });
  const type = s?.lateFeeType === "FLAT" || s?.lateFeeType === "PER_DAY" ? s.lateFeeType : "NONE";
  return { type, amount: s?.lateFeeAmount ?? 0, graceDays: s?.lateFeeGraceDays ?? 0, cap: s?.lateFeeCap ?? 0, dueDay: s?.feeDueDay ?? 10 };
}

const DAY = 86_400_000;
export const startOfDayUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Whole days past the due date (plus grace); 0 when still on time. Paying ON the last day is not late. */
export function daysLate(rule: Pick<LateRule, "graceDays">, dueDate: Date, asOf: Date): number {
  const lastFreeDay = startOfDayUtc(dueDate).getTime() + rule.graceDays * DAY;
  return Math.max(0, Math.floor((startOfDayUtc(asOf).getTime() - lastFreeDay) / DAY));
}

/** The fine this rule puts on an invoice as of a date. FLAT is charged once; PER_DAY grows daily up to the cap. */
export function lateFeeFor(rule: LateRule, dueDate: Date, asOf: Date): number {
  if (rule.type === "NONE" || rule.amount <= 0) return 0;
  const days = daysLate(rule, dueDate, asOf);
  if (days <= 0) return 0;
  const fee = rule.type === "FLAT" ? rule.amount : rule.amount * days;
  return rule.cap > 0 && rule.type === "PER_DAY" ? Math.min(fee, rule.cap) : fee;
}

type InvoiceLike = { dueDate: Date; lateFee: number; lateFeeWaived: boolean };

/** The late fee to show / charge now: never lower than what is already on the invoice, zero if waived. */
export function effectiveLateFee(rule: LateRule, inv: InvoiceLike, asOf = new Date()): number {
  if (inv.lateFeeWaived) return 0;
  return Math.max(inv.lateFee, lateFeeFor(rule, inv.dueDate, asOf));
}

/** Writes the current rule-based fine onto unpaid, overdue invoices. Returns the ids that changed. */
export async function applyLateFees(companyId: string, scope: { period?: string; invoiceIds?: string[] }, asOf = new Date()): Promise<string[]> {
  const rule = await getLateRule(companyId);
  if (rule.type === "NONE") return [];
  const invoices = await prisma.schoolFeeInvoice.findMany({
    where: { companyId, lateFeeWaived: false, ...(scope.invoiceIds ? { id: { in: scope.invoiceIds } } : scope.period ? { period: scope.period } : {}), dueDate: { lt: asOf } },
    select: { id: true, amount: true, discount: true, lateFee: true, lateFeeWaived: true, dueDate: true, payments: { select: { amount: true } } },
  });
  const changed: string[] = [];
  const byFee = new Map<number, string[]>();
  for (const inv of invoices) {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    if (paid >= Math.max(0, inv.amount - inv.discount + inv.lateFee) - 0.005) continue; // already settled: no fine afterwards
    const fee = effectiveLateFee(rule, inv, asOf);
    if (fee > inv.lateFee + 0.005) { byFee.set(fee, [...(byFee.get(fee) ?? []), inv.id]); changed.push(inv.id); }
  }
  for (const [fee, ids] of byFee) await prisma.schoolFeeInvoice.updateMany({ where: { id: { in: ids }, companyId }, data: { lateFee: fee } });
  return changed;
}
