#!/usr/bin/env node

/**
 * Fix umersajjad user - specific script for current issue
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function fixUmerSajjadUser() {
  console.log("🔧 Fixing umersajjad user...\n");

  try {
    // Check if user exists with name "umersajjad" or "Umer Sajjad"
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: "umer", mode: "insensitive" } },
          { name: { contains: "sajjad", mode: "insensitive" } },
          { email: { contains: "umer", mode: "insensitive" } },
        ],
      },
    });

    console.log(`Found ${users.length} user(s) matching 'umer' or 'sajjad':\n`);

    if (users.length === 0) {
      console.log("❌ No user found with name containing 'umer' or 'sajjad'");
      console.log("\n📋 All users in database:");
      
      const allUsers = await prisma.user.findMany();
      if (allUsers.length === 0) {
        console.log("   No users exist!\n");
        console.log("Creating new user: Umer Sajjad...\n");
        
        const hashedPassword = await bcrypt.hash("us786", 10);
        const newUser = await prisma.user.create({
          data: {
            name: "Umer Sajjad",
            email: "umer@traders.com",
            password: hashedPassword,
            role: "ADMIN",
            active: true,
          },
        });
        
        console.log("✅ User created successfully!");
        console.log("\n📋 User Details:");
        console.log(`   Name:     ${newUser.name}`);
        console.log(`   Email:    ${newUser.email}`);
        console.log(`   Role:     ${newUser.role}`);
        console.log(`   Active:   ${newUser.active}`);
        console.log("\n🔑 Login Credentials:");
        console.log(`   Username: ${newUser.name} (or email: ${newUser.email})`);
        console.log(`   Password: us786`);
        console.log("\n✅ Ab login page par jao aur dropdown se 'Umer Sajjad' select karo!\n");
        return;
      }
      
      allUsers.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.name} (${u.email}) - ${u.role}`);
      });
      
      console.log("\n💡 Agar aapka user dusre name se hai, run:");
      console.log("   npm run user:fix 'email@example.com' 'us786'\n");
      return;
    }

    // Show found users
    users.forEach((u, i) => {
      console.log(`${i + 1}. Name: ${u.name}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Role: ${u.role}`);
      console.log(`   Active: ${u.active ? "✅" : "❌"}`);
      console.log(`   Password Length: ${u.password?.length || 0} chars`);
      console.log(`   Looks Hashed: ${u.password?.startsWith("$2") ? "✅ Yes" : "❌ No (Plain text!)"}`);
      console.log("");
    });

    // Fix each user
    for (const user of users) {
      console.log(`\n🔧 Fixing user: ${user.name}...`);
      
      // Check if password is already bcrypt hashed
      const isHashed = user.password?.startsWith("$2");
      
      if (!isHashed) {
        console.log("   ⚠️  Password is plain text! Hashing...");
        const hashedPassword = await bcrypt.hash("us786", 10);
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            active: true,
            // Ensure email exists
            email: user.email || `${user.name.toLowerCase().replace(/\s+/g, "")}@traders.com`,
          },
        });
        
        console.log("   ✅ Password hashed!");
      } else {
        console.log("   ✅ Password already hashed");
        
        // Just ensure user is active
        await prisma.user.update({
          where: { id: user.id },
          data: {
            active: true,
            email: user.email || `${user.name.toLowerCase().replace(/\s+/g, "")}@traders.com`,
          },
        });
      }
      
      console.log("   ✅ User updated!");
    }

    console.log("\n" + "=".repeat(50));
    console.log("\n✅ ALL USERS FIXED!\n");
    
    // Show updated users
    const updatedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: "umer", mode: "insensitive" } },
          { name: { contains: "sajjad", mode: "insensitive" } },
        ],
      },
    });
    
    console.log("📋 Updated User Details:\n");
    updatedUsers.forEach((u) => {
      console.log(`Name:     ${u.name}`);
      console.log(`Email:    ${u.email}`);
      console.log(`Role:     ${u.role}`);
      console.log(`Active:   ${u.active ? "✅" : "❌"}`);
      console.log(`Password: ${u.password?.startsWith("$2") ? "✅ Properly Hashed" : "❌ Issue!"}`);
      console.log("");
    });
    
    console.log("🔑 Login Credentials:");
    console.log(`   Username: ${updatedUsers[0].name} (select from dropdown)`);
    console.log(`   OR Email: ${updatedUsers[0].email}`);
    console.log(`   Password: us786`);
    console.log("\n✅ Ab login page par jao aur dropdown se select karo!\n");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixUmerSajjadUser();
