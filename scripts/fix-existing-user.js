#!/usr/bin/env node

/**
 * Fix Existing User Script
 * Updates password for an existing user with proper bcrypt hash
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function fixUser() {
  console.log("🔧 Fix Existing User Password...\n");

  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("Usage: node scripts/fix-existing-user.js <email> <new-password>");
    console.log("\nExample:");
    console.log('  node scripts/fix-existing-user.js "umer@example.com" "us786"');
    process.exit(1);
  }

  const [email, plainPassword] = args;

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!existingUser) {
      console.error(`❌ User with email "${email}" not found!`);
      console.log("\n📋 Available users:");
      
      const allUsers = await prisma.user.findMany({
        select: { name: true, email: true, role: true, active: true },
      });
      
      allUsers.forEach(u => {
        console.log(`   • ${u.name} (${u.email}) - ${u.role} ${u.active ? '✅' : '❌'}`);
      });
      
      process.exit(1);
    }

    // Hash new password
    console.log("🔐 Hashing new password...");
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Update user
    const updatedUser = await prisma.user.update({
      where: { email: email.toLowerCase().trim() },
      data: {
        password: hashedPassword,
        active: true, // Make sure user is active
      },
    });

    console.log("\n✅ Password updated successfully!");
    console.log("\n📋 User Details:");
    console.log(`   Name:     ${updatedUser.name}`);
    console.log(`   Email:    ${updatedUser.email}`);
    console.log(`   Role:     ${updatedUser.role}`);
    console.log(`   Active:   ${updatedUser.active}`);
    
    console.log("\n🔑 New Login Credentials:");
    console.log(`   Email:    ${updatedUser.email}`);
    console.log(`   Password: ${plainPassword}`);
    console.log("\n⚠️  Login mein EMAIL use karein, name nahi!\n");

  } catch (error) {
    console.error("\n❌ Error updating user:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixUser();
