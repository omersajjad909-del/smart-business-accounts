import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const demos = await prisma.company.findMany({ where: { isDemo: true }, select: { id: true, businessType: true } });
let removed = 0;
for (const c of demos) {
  const accounts = await prisma.account.count({ where: { companyId: c.id } });
  if (accounts === 0) {
    await prisma.userCompany.deleteMany({ where: { companyId: c.id } });
    await prisma.session.deleteMany({ where: { companyId: c.id } });
    await prisma.company.delete({ where: { id: c.id } });
    console.log("removed empty shell:", c.businessType, c.id.slice(0, 8));
    removed++;
  }
}
console.log("removed:", removed);
await prisma.$disconnect();
