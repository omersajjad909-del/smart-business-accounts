import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("us786", 10);

  // Create Admin user
  await prisma.user.upsert({
    where: { email: "admin@local.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@local.com",
      password,
      role: "ADMIN",
      active: true,
    },
  });

  console.log("✅ Admin user created");

  // Set default permissions for ACCOUNTANT role
  await prisma.rolePermission.deleteMany({ where: { role: "ACCOUNTANT" } });
  
  const accountantPermissions = [
    "VIEW_ACCOUNTS",
    "CREATE_CPV",
    "CREATE_CRV",
    "VIEW_CATALOG",
    "VIEW_INVENTORY",
    "VIEW_FINANCIAL_REPORTS",
    "VIEW_REPORTS",
    "VIEW_LEDGER_REPORT",
    "VIEW_TRIAL_BALANCE_REPORT",
    "VIEW_AGEING_REPORT",
  ];

  for (const perm of accountantPermissions) {
    await prisma.rolePermission.create({
      data: { role: "ACCOUNTANT", permission: perm },
    });
  }
  console.log("✅ ACCOUNTANT role permissions set");

  // Set default permissions for VIEWER role
  await prisma.rolePermission.deleteMany({ where: { role: "VIEWER" } });
  
  const viewerPermissions = [
    "VIEW_ACCOUNTS",
    "VIEW_CATALOG",
    "VIEW_INVENTORY",
    "VIEW_FINANCIAL_REPORTS",
    "VIEW_REPORTS",
    "VIEW_LEDGER_REPORT",
    "VIEW_TRIAL_BALANCE_REPORT",
    "VIEW_AGEING_REPORT",
  ];

  for (const perm of viewerPermissions) {
    await prisma.rolePermission.create({
      data: { role: "VIEWER", permission: perm },
    });
  }
  console.log("✅ VIEWER role permissions set");

  // ADMIN has all permissions (no need to store in DB)
  console.log("✅ ADMIN role (all permissions by default)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
