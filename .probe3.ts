import { prisma } from "./lib/prisma";
const cid = process.argv[2];
(async () => {
  const inv = await prisma.salesInvoice.findMany({ where: { companyId: cid }, include: { items: true, customer: { select: { name: true } } }, orderBy: { date: "asc" } });
  let T = 0;
  for (const i of inv) {
    const itemsAmt = i.items.reduce((s, x) => s + x.amount, 0);
    const itemsQR = i.items.reduce((s, x) => s + x.qty * x.rate, 0);
    T += i.total;
    console.log(i.invoiceNo, i.date.toISOString().slice(0, 10), i.approvalStatus, i.deletedAt ? "DEL" : "", (i.customer?.name || "").slice(0, 16).padEnd(16), "total", i.total, "disc", i.discount, "frt", i.freight, "taxCfg", !!i.taxConfigId, "| items", i.items.length, "sumAmt", itemsAmt, "sumQxR", itemsQR, "tax%", i.items.map(x => x.taxPercent).join("/"));
  }
  console.log("SUM total", T);
  const siv = await prisma.voucher.findMany({ where: { companyId: cid, type: "SI" }, include: { entries: { include: { account: { select: { name: true } } } } } });
  for (const v of siv.slice(0, 3)) console.log(v.voucherNo, v.entries.map(e => `${e.account.name}:${e.amount}`).join(" "));
  await prisma.$disconnect();
})();
