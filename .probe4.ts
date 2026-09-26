import { prisma } from "./lib/prisma";
const cid = process.argv[2];
(async () => {
  const inv = await prisma.salesInvoice.findMany({ where: { companyId: cid }, include: { items: true }, orderBy: { date: "asc" } });
  const siv = await prisma.voucher.findMany({ where: { companyId: cid, type: { in: ["SI", "COGS"] } }, include: { entries: { include: { account: { select: { name: true } } } } } });
  for (const i of inv) {
    const v = siv.filter(x => x.type === "SI" && x.voucherNo === i.invoiceNo);
    const sales = v.flatMap(x => x.entries).filter(e => /sales rev|^sales$/i.test(e.account.name)).reduce((s, e) => s - e.amount, 0);
    const net = i.items.reduce((s, x) => s + x.amount, 0);
    const cg = siv.filter(x => x.type === "COGS" && (x.voucherNo.includes(i.invoiceNo) || (x as any).invoiceId === i.id || (x.narration || "").includes(i.invoiceNo)));
    console.log(i.invoiceNo, "items net", net, "| SI vouchers", v.length, "ledger sales", sales, v[0]?.deletedAt ? "VOUCHER-DELETED" : "", v[0] ? v[0].date.toISOString().slice(0,10) : "", "| COGS vouchers", cg.length, cg.map(c => c.entries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0)).join(","));
  }
  const cogsAll = siv.filter(x => x.type === "COGS").map(x => `${x.voucherNo} ${x.narration?.slice(0, 40)}`);
  console.log(cogsAll.join("\n"));
  await prisma.$disconnect();
})();
