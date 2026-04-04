// @ts-check
"use strict";

/**
 * Seed Demo Account Script
 * Creates demo@finova.com with sample data. Idempotent — safe to run multiple times.
 * Usage: node scripts/seed-demo.js
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@finova.com";
const DEMO_PASSWORD = "Demo@1234";
const DEMO_NAME = "Demo User";
const DEMO_ROLE = "ADMIN";

const DEMO_COMPANY = {
  name: "FinovaOS Demo Co.",
  country: "PK",
  baseCurrency: "PKR",
  businessType: "trading",
  businessSetupDone: true,
  plan: "PRO",
  subscriptionStatus: "ACTIVE",
};

const SALES_INVOICES = [
  { title: "INV-001", amount: 50000 },
  { title: "INV-002", amount: 35000 },
  { title: "INV-003", amount: 72000 },
  { title: "INV-004", amount: 28000 },
  { title: "INV-005", amount: 91000 },
];

const PURCHASE_INVOICES = [
  { title: "PUR-001", amount: 30000 },
  { title: "PUR-002", amount: 22000 },
  { title: "PUR-003", amount: 48000 },
  { title: "PUR-004", amount: 15000 },
  { title: "PUR-005", amount: 60000 },
];

const POS_SALES = [
  { title: "POS Sale", amount: 5000 },
  { title: "POS Sale", amount: 8500 },
  { title: "POS Sale", amount: 3200 },
];

async function seedBusinessRecords(companyId) {
  const existingCount = await prisma.businessRecord.count({
    where: { companyId },
  });

  if (existingCount >= 5) {
    console.log(`  ℹ  Business records already seeded (${existingCount} found), skipping.`);
    return;
  }

  const now = new Date();

  const records = [
    ...SALES_INVOICES.map((inv) => ({
      companyId,
      category: "sales_invoice",
      title: inv.title,
      amount: inv.amount,
      status: "posted",
      data: { title: inv.title, amount: inv.amount, status: "posted" },
      date: now,
    })),
    ...PURCHASE_INVOICES.map((inv) => ({
      companyId,
      category: "purchase_invoice",
      title: inv.title,
      amount: inv.amount,
      status: "posted",
      data: { title: inv.title, amount: inv.amount, status: "posted" },
      date: now,
    })),
    ...POS_SALES.map((sale) => ({
      companyId,
      category: "pos_sale",
      title: sale.title,
      amount: sale.amount,
      status: "completed",
      data: { title: sale.title, amount: sale.amount, status: "completed" },
      date: now,
    })),
  ];

  await prisma.businessRecord.createMany({ data: records });
  console.log(`  + Created ${records.length} business records (5 sales, 5 purchase, 3 POS).`);
}

async function main() {
  console.log("=== FinovaOS Demo Account Seeder ===\n");

  // Check if demo user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (existingUser) {
    console.log(`  ℹ  User "${DEMO_EMAIL}" already exists (id: ${existingUser.id}).`);

    const companyId = existingUser.defaultCompanyId;
    if (companyId) {
      console.log(`  ℹ  Checking business records for company ${companyId}...`);
      await seedBusinessRecords(companyId);
    } else {
      console.log("  ⚠  No defaultCompanyId on existing user — skipping record seed.");
    }

    console.log("\n✅ Demo account ready: demo@finova.com / Demo@1234");
    return;
  }

  // Create demo company
  console.log("  + Creating demo company...");
  const company = await prisma.company.create({
    data: DEMO_COMPANY,
  });
  console.log(`    Company: "${company.name}" (id: ${company.id})`);

  // Hash password
  console.log("  + Hashing password...");
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Create demo user
  console.log("  + Creating demo user...");
  const user = await prisma.user.create({
    data: {
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      password: hashedPassword,
      role: DEMO_ROLE,
      active: true,
      defaultCompanyId: company.id,
    },
  });
  console.log(`    User: "${user.name}" <${user.email}> (id: ${user.id})`);

  // Link user to company
  console.log("  + Linking user to company...");
  await prisma.userCompany.create({
    data: {
      userId: user.id,
      companyId: company.id,
      isDefault: true,
    },
  });

  // Seed business records
  console.log("  + Seeding sample business records...");
  await seedBusinessRecords(company.id);

  console.log("\n✅ Demo account ready: demo@finova.com / Demo@1234");
}

main()
  .catch((err) => {
    console.error("\n❌ Seeder failed:", err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
