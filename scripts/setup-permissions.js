#!/usr/bin/env node

/**
 * Setup Complete Permissions System
 * Assigns all permissions to roles properly
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// All available permissions
const ALL_PERMISSIONS = {
  // Dashboard & Admin
  VIEW_DASHBOARD: "VIEW_DASHBOARD",
  VIEW_LOGS: "VIEW_LOGS",
  MANAGE_USERS: "MANAGE_USERS",
  MANAGE_ROLES: "MANAGE_ROLES",
  VIEW_AUDIT_LOG: "VIEW_AUDIT_LOG",

  // Accounts
  VIEW_ACCOUNTS: "VIEW_ACCOUNTS",
  CREATE_ACCOUNTS: "CREATE_ACCOUNTS",
  CREATE_CPV: "CREATE_CPV",
  CREATE_CRV: "CREATE_CRV",

  // Catalog/Items
  VIEW_CATALOG: "VIEW_CATALOG",
  CREATE_ITEMS: "CREATE_ITEMS",
  CREATE_STOCK_RATE: "CREATE_STOCK_RATE",

  // Sales & Distribution
  CREATE_QUOTATION: "CREATE_QUOTATION",
  CREATE_DELIVERY_CHALLAN: "CREATE_DELIVERY_CHALLAN",
  CREATE_SALES_INVOICE: "CREATE_SALES_INVOICE",
  CREATE_SALE_RETURN: "CREATE_SALE_RETURN",

  // Inventory
  VIEW_INVENTORY: "VIEW_INVENTORY",
  CREATE_PURCHASE_ORDER: "CREATE_PURCHASE_ORDER",
  CREATE_PURCHASE_INVOICE: "CREATE_PURCHASE_INVOICE",
  CREATE_OUTWARD: "CREATE_OUTWARD",

  // Financial Reports
  VIEW_FINANCIAL_REPORTS: "VIEW_FINANCIAL_REPORTS",
  VIEW_REPORTS: "VIEW_REPORTS",
  VIEW_AGEING_REPORT: "VIEW_AGEING_REPORT",
  VIEW_LEDGER_REPORT: "VIEW_LEDGER_REPORT",
  VIEW_TRIAL_BALANCE_REPORT: "VIEW_TRIAL_BALANCE_REPORT",
  VIEW_PROFIT_LOSS_REPORT: "VIEW_PROFIT_LOSS_REPORT",
  VIEW_BALANCE_SHEET_REPORT: "VIEW_BALANCE_SHEET_REPORT",

  // Inventory Reports
  VIEW_INVENTORY_REPORTS: "VIEW_INVENTORY_REPORTS",
  VIEW_INWARD: "VIEW_INWARD",
  VIEW_OUTWARD: "VIEW_OUTWARD",
  VIEW_SALES_REPORT: "VIEW_SALES_REPORT",
  VIEW_STOCK_LEDGER: "VIEW_STOCK_LEDGER",
  VIEW_STOCK_SUMMARY: "VIEW_STOCK_SUMMARY",
  VIEW_LOW_STOCK: "VIEW_LOW_STOCK",
  VIEW_LOCATION: "VIEW_LOCATION",

  // Banking & Payment
  BANK_RECONCILIATION: "BANK_RECONCILIATION",
  PAYMENT_RECEIPTS: "PAYMENT_RECEIPTS",
  EXPENSE_VOUCHERS: "EXPENSE_VOUCHERS",
  TAX_CONFIGURATION: "TAX_CONFIGURATION",

  // HR & Payroll
  VIEW_HR_PAYROLL: "VIEW_HR_PAYROLL",

  // CRM
  VIEW_CRM: "VIEW_CRM",

  // Settings
  VIEW_SETTINGS: "VIEW_SETTINGS",

  // Advanced Features
  BUDGET_PLANNING: "BUDGET_PLANNING",
  RECURRING_TRANSACTIONS: "RECURRING_TRANSACTIONS",
  FINANCIAL_YEAR: "FINANCIAL_YEAR",
  BACKUP_RESTORE: "BACKUP_RESTORE",
  EMAIL_SETTINGS: "EMAIL_SETTINGS",
};

// Role-based permission assignments
const ROLE_PERMISSIONS = {
  ADMIN: Object.values(ALL_PERMISSIONS), // All permissions
  
  ACCOUNTANT: [
    // Dashboard & Basic
    "VIEW_DASHBOARD",
    
    // Accounts - Full Access
    "VIEW_ACCOUNTS",
    "CREATE_ACCOUNTS",
    "CREATE_CPV",
    "CREATE_CRV",
    
    // Catalog - View + Create
    "VIEW_CATALOG",
    "CREATE_ITEMS",
    "CREATE_STOCK_RATE",
    
    // Sales - Limited
    "CREATE_QUOTATION",
    "CREATE_DELIVERY_CHALLAN",
    "CREATE_SALES_INVOICE",
    "CREATE_SALE_RETURN",
    
    // Inventory - View + Create
    "VIEW_INVENTORY",
    "CREATE_PURCHASE_ORDER",
    "CREATE_PURCHASE_INVOICE",
    "CREATE_OUTWARD",
    
    // Financial Reports - Full Access
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
    
    // HR - View Only
    "VIEW_HR_PAYROLL",
    
    // Advanced
    "BUDGET_PLANNING",
    "RECURRING_TRANSACTIONS",
    "FINANCIAL_YEAR",
  ],
  
  VIEWER: [
    // Dashboard
    "VIEW_DASHBOARD",
    
    // Accounts - View Only
    "VIEW_ACCOUNTS",
    
    // Catalog - View Only
    "VIEW_CATALOG",
    
    // Inventory - View Only
    "VIEW_INVENTORY",
    
    // All Reports - View Only
    "VIEW_FINANCIAL_REPORTS",
    "VIEW_REPORTS",
    "VIEW_AGEING_REPORT",
    "VIEW_LEDGER_REPORT",
    "VIEW_TRIAL_BALANCE_REPORT",
    "VIEW_PROFIT_LOSS_REPORT",
    "VIEW_BALANCE_SHEET_REPORT",
    
    // Inventory Reports - View Only
    "VIEW_INVENTORY_REPORTS",
    "VIEW_INWARD",
    "VIEW_OUTWARD",
    "VIEW_SALES_REPORT",
    "VIEW_STOCK_LEDGER",
    "VIEW_STOCK_SUMMARY",
    "VIEW_LOW_STOCK",
    "VIEW_LOCATION",
    
    // HR - View Only
    "VIEW_HR_PAYROLL",
    
    // CRM - View Only
    "VIEW_CRM",
  ],
};

async function setupPermissions() {
  console.log("🔧 Setting up permissions system...\n");

  try {
    // 1. Clear existing role permissions
    console.log("1️⃣ Clearing existing role permissions...");
    await prisma.rolePermission.deleteMany({});
    console.log("   ✅ Cleared\n");

    // 2. Setup ADMIN permissions (all permissions)
    console.log("2️⃣ Setting up ADMIN role (all permissions)...");
    for (const permission of ROLE_PERMISSIONS.ADMIN) {
      await prisma.rolePermission.create({
        data: { role: "ADMIN", permission },
      });
    }
    console.log(`   ✅ ADMIN: ${ROLE_PERMISSIONS.ADMIN.length} permissions\n`);

    // 3. Setup ACCOUNTANT permissions
    console.log("3️⃣ Setting up ACCOUNTANT role...");
    for (const permission of ROLE_PERMISSIONS.ACCOUNTANT) {
      await prisma.rolePermission.create({
        data: { role: "ACCOUNTANT", permission },
      });
    }
    console.log(`   ✅ ACCOUNTANT: ${ROLE_PERMISSIONS.ACCOUNTANT.length} permissions\n`);

    // 4. Setup VIEWER permissions
    console.log("4️⃣ Setting up VIEWER role...");
    for (const permission of ROLE_PERMISSIONS.VIEWER) {
      await prisma.rolePermission.create({
        data: { role: "VIEWER", permission },
      });
    }
    console.log(`   ✅ VIEWER: ${ROLE_PERMISSIONS.VIEWER.length} permissions\n`);

    // 5. Display summary
    console.log("=" .repeat(60));
    console.log("\n✅ Permissions Setup Complete!\n");
    console.log("📊 Summary:");
    console.log(`   ADMIN:      ${ROLE_PERMISSIONS.ADMIN.length} permissions (Full Access)`);
    console.log(`   ACCOUNTANT: ${ROLE_PERMISSIONS.ACCOUNTANT.length} permissions`);
    console.log(`   VIEWER:     ${ROLE_PERMISSIONS.VIEWER.length} permissions (Read Only)`);
    console.log("\n" + "=".repeat(60));

    // 6. Verify in database
    console.log("\n🔍 Verifying database...\n");
    const counts = await Promise.all([
      prisma.rolePermission.count({ where: { role: "ADMIN" } }),
      prisma.rolePermission.count({ where: { role: "ACCOUNTANT" } }),
      prisma.rolePermission.count({ where: { role: "VIEWER" } }),
    ]);

    console.log("Database Verification:");
    console.log(`   ✅ ADMIN: ${counts[0]} permissions stored`);
    console.log(`   ✅ ACCOUNTANT: ${counts[1]} permissions stored`);
    console.log(`   ✅ VIEWER: ${counts[2]} permissions stored`);

    console.log("\n💡 Tips:");
    console.log("   - ADMIN users automatically get all permissions");
    console.log("   - User-specific permissions can override role permissions");
    console.log("   - Use dashboard to manage user-specific permissions\n");

  } catch (error) {
    console.error("\n❌ Error setting up permissions:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupPermissions();
