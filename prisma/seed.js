const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Complete permission sets for each role
const ROLE_PERMISSIONS = {
  ADMIN: [
    // All permissions - ADMIN gets everything automatically in code
    // No need to store in DB
  ],
  
  ACCOUNTANT: [
    // Dashboard & Basic
    "VIEW_DASHBOARD",
    
    // Accounts - Full Access
    "VIEW_ACCOUNTS",
    "CREATE_ACCOUNTS",
    "CREATE_CPV",
    "CREATE_CRV",
    
    // Catalog
    "VIEW_CATALOG",
    "CREATE_ITEMS",
    "CREATE_STOCK_RATE",
    
    // Sales
    "CREATE_QUOTATION",
    "CREATE_DELIVERY_CHALLAN",
    "CREATE_SALES_INVOICE",
    "CREATE_SALE_RETURN",
    
    // Inventory
    "VIEW_INVENTORY",
    "CREATE_PURCHASE_ORDER",
    "CREATE_PURCHASE_INVOICE",
    "CREATE_OUTWARD",
    
    // Financial Reports
    "VIEW_FINANCIAL_REPORTS",
    "VIEW_REPORTS",
    "VIEW_AGEING_REPORT",
    "VIEW_LEDGER_REPORT",
    "VIEW_TRIAL_BALANCE_REPORT",
    "VIEW_PROFIT_LOSS_REPORT",
    "VIEW_BALANCE_SHEET_REPORT",
    
    // Inventory Reports
    "VIEW_INVENTORY_REPORTS",
    "VIEW_INWARD",
    "VIEW_OUTWARD",
    "VIEW_SALES_REPORT",
    "VIEW_STOCK_LEDGER",
    "VIEW_STOCK_SUMMARY",
    "VIEW_LOW_STOCK",
    "VIEW_LOCATION",
    
    // Banking
    "BANK_RECONCILIATION",
    "PAYMENT_RECEIPTS",
    "EXPENSE_VOUCHERS",
    "TAX_CONFIGURATION",
    
    // HR
    "VIEW_HR_PAYROLL",
    
    // Advanced
    "BUDGET_PLANNING",
    "RECURRING_TRANSACTIONS",
    "FINANCIAL_YEAR",
  ],
  
  VIEWER: [
    // Dashboard
    "VIEW_DASHBOARD",
    
    // View Only
    "VIEW_ACCOUNTS",
    "VIEW_CATALOG",
    "VIEW_INVENTORY",
    
    // All Reports
    "VIEW_FINANCIAL_REPORTS",
    "VIEW_REPORTS",
    "VIEW_AGEING_REPORT",
    "VIEW_LEDGER_REPORT",
    "VIEW_TRIAL_BALANCE_REPORT",
    "VIEW_PROFIT_LOSS_REPORT",
    "VIEW_BALANCE_SHEET_REPORT",
    
    // Inventory Reports
    "VIEW_INVENTORY_REPORTS",
    "VIEW_INWARD",
    "VIEW_OUTWARD",
    "VIEW_SALES_REPORT",
    "VIEW_STOCK_LEDGER",
    "VIEW_STOCK_SUMMARY",
    "VIEW_LOW_STOCK",
    "VIEW_LOCATION",
    
    // HR/CRM View Only
    "VIEW_HR_PAYROLL",
    "VIEW_CRM",
  ],
};

async function main() {
  console.log("🌱 Seeding database...\n");

  // 0. Create default company
  console.log("0️⃣ Creating default company...");
  const defaultCompany = await prisma.company.upsert({
    where: { code: "DEFAULT" },
    update: {},
    create: {
      name: "Default Company",
      code: "DEFAULT",
      isActive: true,
    },
  });
  console.log(`   ✅ Company: ${defaultCompany.name}\n`);

  await prisma.branch.upsert({
    where: { companyId_code: { companyId: defaultCompany.id, code: "MAIN" } },
    update: { name: "Main Branch", isActive: true },
    create: {
      companyId: defaultCompany.id,
      code: "MAIN",
      name: "Main Branch",
      city: null,
      isActive: true,
    },
  });


  // 1. Create Admin user
  console.log("1️⃣ Creating admin user...");
  const password = await bcrypt.hash("us786", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@local.com" },
    update: { password, active: true, defaultCompanyId: defaultCompany.id }, // Update if exists
    create: {
      name: "Admin",
      email: "admin@local.com",
      password,
      role: "ADMIN",
      active: true,
      defaultCompanyId: defaultCompany.id,
    },
  });
  console.log("   ✅ Admin user: admin@local.com / us786\n");

  // Link admin to default company
  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: adminUser.id, companyId: defaultCompany.id } },
    update: { isDefault: true },
    create: {
      userId: adminUser.id,
      companyId: defaultCompany.id,
      isDefault: true,
    },
  });


  // 2. Setup permissions for each role
  console.log("2️⃣ Setting up role permissions...");
  
  // Clear existing permissions
  await prisma.rolePermission.deleteMany({
    where: { companyId: defaultCompany.id },
  });
  console.log("   🗑️  Cleared existing permissions");

  // Setup ACCOUNTANT permissions
  console.log("   📝 ACCOUNTANT permissions...");
  for (const perm of ROLE_PERMISSIONS.ACCOUNTANT) {
    await prisma.rolePermission.create({
      data: { role: "ACCOUNTANT", permission: perm, companyId: defaultCompany.id },
    });
  }
  console.log(`   ✅ ACCOUNTANT: ${ROLE_PERMISSIONS.ACCOUNTANT.length} permissions`);

  // Setup VIEWER permissions
  console.log("   📝 VIEWER permissions...");
  for (const perm of ROLE_PERMISSIONS.VIEWER) {
    await prisma.rolePermission.create({
      data: { role: "VIEWER", permission: perm, companyId: defaultCompany.id },
    });
  }
  console.log(`   ✅ VIEWER: ${ROLE_PERMISSIONS.VIEWER.length} permissions`);

  console.log("   ✅ ADMIN: All permissions (automatic)\n");

  // 3. Summary
  console.log("=" .repeat(50));
  console.log("\n✅ Seeding Complete!\n");
  console.log("📊 Summary:");
  console.log("   👤 Admin user created");
  console.log(`   🔐 Permissions configured for all roles`);
  console.log("\n🔑 Default Login:");
  console.log("   Email:    admin@local.com");
  console.log("   Password: us786");
  console.log("\n⚠️  Change password after first login!");
  console.log("\n" + "=".repeat(50) + "\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
