// Re-posts sales-invoice vouchers written by the old double-counting code.
// Usage: tsx repost.ts            -> dry run, changes nothing
//        tsx repost.ts --apply    -> backs up old entries, then re-posts
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { salesInvoiceEntries } from "@/lib/salesPosting";
import { toBase } from "@/lib/fx";

const APPLY = process.argv.includes("--apply");
const BACKUP = process.env.BACKUP_FILE!;
const r2 = (n: number) => Math.round(n * 100) / 100;

(async () => {
  const vouchers = await prisma.voucher.findMany({
    where: { type: "SI", deletedAt: null, NOT: { voucherNo: { startsWith: "POS-" } } },
    include: { entries: true },
  });
  const plan: any[] = [];
  const skipped: any[] = [];
  for (const v of vouchers) {
    if (!v.companyId) { skipped.push({ voucherNo: v.voucherNo, why: "voucher has no companyId" }); continue; }
    const inv = await prisma.salesInvoice.findFirst({
      where: { companyId: v.companyId!, invoiceNo: v.voucherNo, deletedAt: null },
      include: { items: true, taxConfig: true },
    });
    if (!inv) continue;
    const subtotal = inv.items.reduce((s, i) => s + i.qty * i.rate, 0);
    const discountAmt = inv.discountType === "percent" ? subtotal * Number(inv.discount || 0) / 100 : Number(inv.discount || 0);
    const itemsTax = inv.items.reduce((s, i) => s + i.qty * i.rate * (1 - (i.discountPercent || 0) / 100) * (i.taxPercent || 0) / 100, 0);
    const globalTax = inv.taxConfig ? (subtotal - discountAmt) * inv.taxConfig.taxRate / 100 : 0;
    const tax = itemsTax + globalTax;
    const freight = Number(inv.freight || 0);
    const ct = await prisma.currencyTransaction.findFirst({ where: { transactionType: "INVOICE", transactionId: inv.id } });
    const rate = ct?.exchangeRate && ct.exchangeRate > 0 ? ct.exchangeRate : 1;

    const cust = v.entries.filter(e => e.accountId === inv.customerId);
    const oldDr = cust.reduce((s, e) => s + e.amount, 0);
    const correctDr = toBase(inv.total, rate);
    if (Math.abs(oldDr - correctDr) < 0.01 && v.entries.length >= 2) continue; // already right

    const why =
      Math.abs(subtotal - discountAmt + tax + freight - inv.total) > 0.05 ? `recomputed total ${r2(subtotal - discountAmt + tax + freight)} != stored ${inv.total}` :
      v.entries.length !== 2 ? `${v.entries.length} entries, expected 2` :
      Math.abs(oldDr - toBase(inv.total + freight + tax, rate)) > 0.05 ? `customer debit ${oldDr} does not match the old bug pattern` : null;
    if (why) { skipped.push({ company: v.companyId, voucherNo: v.voucherNo, why }); continue; }

    plan.push({ v, inv, tax, rate, oldDr, correctDr });
  }

  const dryDb: any = new Proxy(prisma, { get: (t: any, k) => k === "account"
    ? { ...t.account, findFirst: t.account.findFirst.bind(t.account), findMany: t.account.findMany.bind(t.account), create: async ({ data }: any) => ({ id: `(new ${data.name})` }) }
    : t[k] });

  console.log(`${plan.length} to re-post, ${skipped.length} skipped${APPLY ? "" : " — DRY RUN"}`);
  for (const s of skipped) console.log("  SKIP", s.voucherNo, s.why);
  const backup: any[] = [];
  for (const p of plan) {
    const entries = await salesInvoiceEntries(APPLY ? prisma : dryDb, { companyId: p.v.companyId, customerId: p.inv.customerId, total: p.inv.total, tax: p.tax, rate: p.rate });
    console.log(`  ${p.v.voucherNo}: customer ${p.oldDr} -> ${p.correctDr} | ` + entries.map(e => `${e.accountId.slice(0, 14)} ${e.amount}`).join(", "));
    if (Math.abs(entries.reduce((s, e) => s + e.amount, 0)) > 0.005) throw new Error("unbalanced " + p.v.voucherNo);
    backup.push({ voucherId: p.v.id, voucherNo: p.v.voucherNo, companyId: p.v.companyId, entries: p.v.entries });
    if (APPLY) {
      await prisma.$transaction([
        prisma.voucherEntry.deleteMany({ where: { voucherId: p.v.id } }),
        prisma.voucherEntry.createMany({ data: entries.map(e => ({ ...e, voucherId: p.v.id })) }),
      ]);
    }
  }
  if (APPLY) { fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2)); console.log("backup:", BACKUP); }
  await prisma.$disconnect();
})();
