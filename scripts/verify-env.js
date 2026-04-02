#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * Checks if all required variables are set correctly
 */

const requiredVars = [
  'DATABASE_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
];

const optionalVars = [
  'DIRECT_URL',
  'NODE_ENV',
  'NEXT_PUBLIC_APP_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
];

console.log('🔍 Verifying Environment Variables...\n');

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ❌ ${varName} - NOT SET`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${varName} - Set`);
    
    // Special checks
    if (varName === 'DATABASE_URL') {
      if (value.includes(':6543/')) {
        console.log(`     ⚠️  WARNING: Using Port 6543 (Transaction Mode)`);
        console.log(`     → Should use Port 5432 for migrations`);
        hasWarnings = true;
      }
      if (value.includes('pgbouncer=true')) {
        console.log(`     ⚠️  WARNING: pgbouncer parameter found`);
        console.log(`     → May cause issues with migrations`);
        hasWarnings = true;
      }
    }
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ⚠️  ${varName} - Not set (recommended for production)`);
    hasWarnings = true;
  } else {
    console.log(`  ✅ ${varName} - Set`);
  }
});

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('\n❌ ERRORS FOUND: Missing required environment variables');
  console.log('\nPlease set them in:');
  console.log('  - Local: .env.local file');
  console.log('  - Production: Vercel Dashboard → Settings → Environment Variables');
  process.exit(1);
}

if (hasWarnings) {
  console.log('\n⚠️  WARNINGS: Some configuration issues detected');
  console.log('   Review the warnings above and fix if needed');
}

if (!hasErrors && !hasWarnings) {
  console.log('\n✅ All environment variables are properly configured!');
}

console.log('\n' + '='.repeat(50));
console.log('\n💡 Tips:');
console.log('  - Use Port 5432 for DATABASE_URL (not 6543)');
console.log('  - Remove ?pgbouncer=true from connection string');
console.log('  - Set DIRECT_URL same as DATABASE_URL for Supabase');
console.log('  - Use Gmail App Password for SMTP_PASS');
console.log('');

process.exit(hasErrors ? 1 : 0);
