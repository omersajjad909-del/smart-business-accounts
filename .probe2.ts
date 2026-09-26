import { prisma } from "./lib/prisma";
const cid = process.argv[2];
(async () => {
  const v = await prisma.voucher.groupBy({ by: ["type"], where: { companyId: cid }, _count: true });
  console.log("vouchers by type", v.map(x => `${x.type}:${x._count}`).join(" "));
  const vs = await prisma.voucher.findMany({ where: { companyId: cid }, select: { type: true, voucherNo: true, date: true, deletedAt: true, _count: { select: { entries: true } } }, orderBy: { date: "asc" } });
  console.log(vs.map(x => `${x.type} ${x.voucherNo} ${x.date.toISOString().slice(0,10)} entries=${x._count.entries}${x.deletedAt ? " DELETED" : ""}`).join("\n"));
  const si = await prisma.salesInvoice.findMany({ where: { companyId: cid }, select: { invoiceNo: true, date: true, total: true, approvalStatus: true, deletedAt: true } });
  console.log("invoices", si.map(x => `${x.invoiceNo} ${x.date.toISOString().slice(0,10)} ${x.total} ${x.approvalStatus}${x.deletedAt?" DEL":""}`).join(" | "));
  await prisma.$disconnect();
})();
