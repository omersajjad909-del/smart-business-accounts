import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const names = ["Sajjad Enterprises"];
const companies = await prisma.company.findMany({
  where: { name: { in: names } },
  select: {
    id: true, companyNo: true, name: true, plan: true, subscriptionStatus: true,
    stripeCustomerId: true, currentPeriodEnd: true, createdAt: true,
    isActive: true, isDemo: true, isInternalTest: true, baseCurrency: true, country: true,
  },
  orderBy: { companyNo: "asc" },
});

for (const c of companies) {
  console.log("=".repeat(70));
  console.log(`#${c.companyNo}  ${c.id}`);
  console.log(`  plan=${c.plan} status=${c.subscriptionStatus} active=${c.isActive} demo=${c.isDemo} test=${c.isInternalTest}`);
  console.log(`  customerId=${c.stripeCustomerId}  renewal=${c.currentPeriodEnd?.toISOString().slice(0,10)}`);
  console.log(`  created=${c.createdAt.toISOString().slice(0,16)}  currency=${c.baseCurrency} country=${c.country}`);

  const users = await prisma.userCompany.findMany({
    where: { companyId: c.id },
    include: { user: { select: { email: true, name: true, role: true } } },
  });
  console.log(`  users(${users.length}): ${users.map(u => `${u.user.email}[${u.role}]`).join(", ") || "none"}`);

  const sub = await prisma.subscription.findUnique({ where: { companyId: c.id } });
  console.log(`  subscription: ${sub ? `${sub.provider} ${sub.plan}/${sub.status} cust=${sub.stripeCustomerId} sub=${sub.stripeSubscriptionId}` : "NONE"}`);

  const sess = await prisma.session.count({ where: { companyId: c.id } });
  const lastSess = await prisma.session.findFirst({ where: { companyId: c.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  console.log(`  sessions: ${sess}  last=${lastSess?.createdAt.toISOString().slice(0,16) || "never"}`);

  const bk = await prisma.systemBackup.findMany({ where: { companyId: c.id }, select: { fileName: true, fileSize: true }, orderBy: { createdAt: "desc" }, take: 3 });
  console.log(`  backups: ${bk.map(b => `${b.fileName} (${b.fileSize}B)`).join(" | ")}`);
}
await prisma.$disconnect();
