import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const companies = await prisma.company.findMany({
  where: { isDemo: true },
  select: { id: true, name: true, businessType: true, demoExpiresAt: true },
  orderBy: { createdAt: "asc" },
});

for (const c of companies) {
  const [accounts, items, sales, purchases, employees, ledger] = await Promise.all([
    prisma.account.count({ where: { companyId: c.id } }),
    prisma.itemNew.count({ where: { companyId: c.id } }),
    prisma.salesInvoice.count({ where: { companyId: c.id } }),
    prisma.purchaseInvoice.count({ where: { companyId: c.id } }),
    prisma.employee.count({ where: { companyId: c.id } }),
    prisma.ledgerEntry.count({ where: { companyId: c.id } }),
  ]);
  const state = c.demoExpiresAt ? "CLAIMED" : "idle";
  console.log(
    `${c.businessType.padEnd(20)} ${state.padEnd(8)} acc=${accounts} items=${items} sales=${sales} pur=${purchases} emp=${employees} ledger=${ledger}  ${c.id.slice(0, 8)}`
  );
}
console.log(`\ntotal demo companies: ${companies.length}`);
await prisma.$disconnect();
