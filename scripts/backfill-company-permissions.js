const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function pickDefaultCompanyId() {
  const byCode = await prisma.company.findFirst({ where: { code: "DEFAULT" } });
  if (byCode) return byCode.id;
  const first = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  return first?.id || null;
}

async function main() {
  console.log("?? Backfilling companyId for permissions/logs...");

  const fallbackCompanyId = await pickDefaultCompanyId();
  if (!fallbackCompanyId) {
    throw new Error("No company found to use as fallback.");
  }

  // RolePermission
  const rolePerms = await prisma.rolePermission.findMany({
    where: { companyId: null },
    select: { id: true },
  });
  if (rolePerms.length) {
    await prisma.rolePermission.updateMany({
      where: { id: { in: rolePerms.map((r) => r.id) } },
      data: { companyId: fallbackCompanyId },
    });
  }
  console.log(`? RolePermission updated: ${rolePerms.length}`);

  // UserPermission
  const userPerms = await prisma.userPermission.findMany({
    where: { companyId: null },
    select: { id: true, userId: true },
  });

  let userPermUpdated = 0;
  for (const up of userPerms) {
    const user = await prisma.user.findUnique({
      where: { id: up.userId },
      select: { defaultCompanyId: true },
    });
    const companyId = user?.defaultCompanyId || fallbackCompanyId;
    await prisma.userPermission.update({
      where: { id: up.id },
      data: { companyId },
    });
    userPermUpdated += 1;
  }
  console.log(`? UserPermission updated: ${userPermUpdated}`);

  // ActivityLog
  const logs = await prisma.activityLog.findMany({
    where: { companyId: null },
    select: { id: true, userId: true },
  });

  let logUpdated = 0;
  for (const log of logs) {
    let companyId = fallbackCompanyId;
    if (log.userId) {
      const user = await prisma.user.findUnique({
        where: { id: log.userId },
        select: { defaultCompanyId: true },
      });
      if (user?.defaultCompanyId) companyId = user.defaultCompanyId;
    }
    await prisma.activityLog.update({
      where: { id: log.id },
      data: { companyId },
    });
    logUpdated += 1;
  }
  console.log(`? ActivityLog updated: ${logUpdated}`);

  console.log("?? Backfill complete.");
}

main()
  .catch((e) => {
    console.error("? Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
