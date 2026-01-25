#!/usr/bin/env node

/**
 * Create User Script
 * Properly creates a user with bcrypt hashed password
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createUser() {
  console.log("👤 Creating New User...\n");

  // Get user input
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log("Usage: node scripts/create-user.js <name> <email> <password> <role>");
    console.log("\nExample:");
    console.log('  node scripts/create-user.js "Umer Sajjad" "umer@example.com" "us786" "ADMIN"');
    console.log("\nRoles: ADMIN, ACCOUNTANT, VIEWER");
    process.exit(1);
  }

  const [name, email, plainPassword, role] = args;

  // Validate role
  const validRoles = ["ADMIN", "ACCOUNTANT", "VIEWER"];
  if (!validRoles.includes(role.toUpperCase())) {
    console.error(`❌ Invalid role. Must be one of: ${validRoles.join(", ")}`);
    process.exit(1);
  }

  try {
    // Hash password
    console.log("🔐 Hashing password...");
    const password = await bcrypt.hash(plainPassword, 10);

    // Create or update user
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase().trim() },
      update: {
        name,
        password,
        role: role.toUpperCase(),
        active: true,
      },
      create: {
        name,
        email: email.toLowerCase().trim(),
        password,
        role: role.toUpperCase(),
        active: true,
      },
    });

    console.log("\n✅ User created/updated successfully!");
    console.log("\n📋 User Details:");
    console.log(`   Name:     ${user.name}`);
    console.log(`   Email:    ${user.email}`);
    console.log(`   Role:     ${user.role}`);
    console.log(`   Active:   ${user.active}`);
    console.log(`   ID:       ${user.id}`);
    
    console.log("\n🔑 Login Credentials:");
    console.log(`   Email:    ${user.email}`);
    console.log(`   Password: ${plainPassword}`);
    console.log("\n⚠️  IMPORTANT: Login mein EMAIL use karein, username nahi!\n");

  } catch (error) {
    console.error("\n❌ Error creating user:", error.message);
    
    if (error.code === "P2002") {
      console.error("\n⚠️  Email already exists. User updated instead.");
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
