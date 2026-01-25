#!/usr/bin/env node

/**
 * Generate Bcrypt Hash for Password
 * Quick tool to generate hash for manual database entry
 */

const bcrypt = require("bcryptjs");

const password = process.argv[2] || "us786";

console.log("\n🔐 Generating Bcrypt Hash...\n");
console.log(`Password: ${password}\n`);

bcrypt.hash(password, 10).then(hash => {
  console.log("✅ Bcrypt Hash Generated:\n");
  console.log("─".repeat(60));
  console.log(hash);
  console.log("─".repeat(60));
  console.log("\n📋 Copy this hash and paste in Supabase:");
  console.log("   1. Go to Supabase → Table Editor → User table");
  console.log("   2. Find your user (umersajjad)");
  console.log("   3. Edit the 'password' field");
  console.log("   4. Paste the hash above");
  console.log("   5. Save\n");
  console.log("💡 Then login with:");
  console.log(`   Username: umersajjad (or Umer Sajjad)`);
  console.log(`   Password: ${password}\n`);
}).catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
