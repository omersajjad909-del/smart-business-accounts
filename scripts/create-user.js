#!/usr/bin/env node

require("dotenv").config(); // 🔥 Load .env for DB connection

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

    // 🔥 Fix for "Company context required" and "Verification"
    console.log("🛠️  Linking to default company and marking as verified...");
    
    const firstCompany = await prisma.company.findFirst();
    const targetCompanyId = firstCompany ? firstCompany.id : null;

    if (!targetCompanyId) {
      console.log("⚠️  No company found in database. Please create a company first or run seeds.");
    } else {
      // 1. Mark as verified so login proceeds
      await prisma.activityLog.upsert({
        where: { id: `verified-${user.id}` },
        update: { createdAt: new Date() },
        create: {
          id: `verified-${user.id}`,
          action: "EMAIL_VERIFIED",
          userId: user.id,
          companyId: targetCompanyId,
          details: "Verified via setup script",
        }
      });

      // 2. Link to first company
      await prisma.userCompany.upsert({
        where: { userId_companyId: { userId: user.id, companyId: targetCompanyId } },
        update: {},
        create: {
          userId: user.id,
          companyId: targetCompanyId,
          isDefault: true
        }
      });
      
      await prisma.user.update({
        where: { id: user.id },
        data: { defaultCompanyId: targetCompanyId }
      });
      console.log(`🔗 Linked to company: ${firstCompany.name} and marked as VERIFIED.`);
    }

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
