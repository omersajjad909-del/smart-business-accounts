#!/usr/bin/env node

/**
 * List All Users Script
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function listUsers() {
  console.log("👥 All Users in Database:\n");

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (users.length === 0) {
      console.log("❌ No users found in database!");
      console.log("\nRun this to create default admin:");
      console.log("  npm run seed\n");
      process.exit(0);
    }

    console.log(`Found ${users.length} user(s):\n`);

    users.forEach((user, index) => {
      const status = user.active ? "✅ Active" : "❌ Inactive";
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email:     ${user.email}`);
      console.log(`   Role:      ${user.role}`);
      console.log(`   Status:    ${status}`);
      console.log(`   ID:        ${user.id}`);
      console.log(`   Created:   ${user.createdAt.toLocaleDateString()}`);
      console.log("");
    });

    console.log("💡 Tips:");
    console.log("   • Login mein EMAIL use karein (username nahi)");
    console.log("   • Password must be bcrypt hashed");
    console.log("   • Use scripts/create-user.js to add new users properly");
    console.log("   • Use scripts/fix-existing-user.js to fix password\n");

  } catch (error) {
    console.error("❌ Error fetching users:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
