import { prisma } from "./lib/prisma";
const cid = process.argv[2];
(async () => {
  const acc = await prisma.account.findMany({ where: { companyId: cid, type: { in: ["INCOME", "EXPENSE"] } }, select: { id: true, name: true, type: true } });
  for (const a of acc) {
    const es = await prisma.voucherEntry.findMany({ where: { accountId: a.id }, include: { voucher: { select: { type: true, voucherNo: true, date: true, deletedAt: true, narration: true } } } });
    if (!es.length) continue;
    console.log("##", a.type, a.name, "net", es.filter(e => !e.voucher.deletedAt).reduce((s, e) => s + e.amount, 0));
    for (const e of es) console.log("   ", e.voucher.type, e.voucher.voucherNo, e.voucher.date.toISOString().slice(0, 10), e.amount, e.voucher.deletedAt ? "DELETED" : "", (e.voucher.narration || "").slice(0, 50));
  }
  await prisma.$disconnect();
})();
