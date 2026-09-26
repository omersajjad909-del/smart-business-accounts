import { prisma } from "./lib/prisma";
(async () => {
  const g = await prisma.inventoryTxn.groupBy({ by: ["type"], where: { companyId: process.argv[2] }, _count: true, _sum: { qty: true }, _min: { qty: true } });
  console.log(g.map(x => `${x.type}: n=${x._count} sumQty=${x._sum.qty} minQty=${x._min.qty}`).join("\n"));
  await prisma.$disconnect();
})();
