/**
 * Backfill Subscription.pricePerMonth / totalPaid from the PlatformInvoice ledger.
 *
 * The webhook only writes these going forward, so every subscription that was
 * charged before the fix still reads 0. The ledger is the source of truth for
 * money collected, so the figures are recomputed from it rather than guessed
 * from plan list prices. Idempotent: it sets absolute values, never increments.
 *
 * Run with --apply to write. Without it, prints what it would change.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const monthlyRate = (total, cycle) =>
  String(cycle || 'MONTHLY').toUpperCase() === 'YEARLY' ? total / 12 : total;

(async () => {
  const subs = await p.subscription.findMany({
    select: { companyId: true, plan: true, pricePerMonth: true, totalPaid: true, billingCycle: true },
  });

  let changed = 0;
  for (const s of subs) {
    const rows = await p.platformInvoice.findMany({
      where: { companyId: s.companyId, status: { not: 'VOID' } },
      orderBy: { issuedAt: 'desc' },
      select: { total: true, refundedAmount: true, billingCycle: true, issuedAt: true, number: true },
    });
    if (rows.length === 0) continue;

    const totalPaid = rows.reduce(
      (sum, r) => sum + (Number(r.total) || 0) - (Number(r.refundedAmount) || 0), 0);
    const latest = rows[0];
    const pricePerMonth = monthlyRate(Number(latest.total) || 0, latest.billingCycle || s.billingCycle);

    const round = (n) => Math.round(n * 100) / 100;
    if (round(s.pricePerMonth) === round(pricePerMonth) && round(s.totalPaid) === round(totalPaid)) continue;

    changed++;
    console.log(
      `${s.companyId}  ${s.plan}  ` +
      `pricePerMonth ${s.pricePerMonth} -> ${round(pricePerMonth)}  ` +
      `totalPaid ${s.totalPaid} -> ${round(totalPaid)}  ` +
      `(${rows.length} invoice(s), latest ${latest.number})`);

    if (APPLY) {
      await p.subscription.update({
        where: { companyId: s.companyId },
        data: { pricePerMonth: round(pricePerMonth), totalPaid: round(totalPaid) },
      });
    }
  }

  console.log(`\n${APPLY ? 'UPDATED' : 'WOULD UPDATE'} ${changed} of ${subs.length} subscriptions`);
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
