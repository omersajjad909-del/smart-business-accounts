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
  'RESEND_API_KEY',
  'RESEND_FROM_DOMAIN',
];

/** Placeholder values in .env.example that must not survive into production. */
function isPlaceholder(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return true;
  return v.startsWith('your_') || v.includes('your-') || v.includes('placeholder');
}

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

// ─── AI Prospecting / cold outreach ─────────────────────────────────────────
// Only checked when the master switch is on. With it off the pipeline still
// runs end to end up to review, which is the safe default.
const outreachOn = String(process.env.OUTREACH_SENDING_ENABLED || '').toLowerCase() === 'true';
console.log(`\n📋 AI Prospecting (OUTREACH_SENDING_ENABLED=${outreachOn}):`);

if (!outreachOn) {
  console.log('  ✅ Sending is off — nothing can leave. Drafting and review still work.');
} else {
  ['OUTREACH_FROM_EMAIL', 'OUTREACH_SMTP_HOST', 'OUTREACH_SMTP_USER', 'OUTREACH_SMTP_PASS'].forEach((varName) => {
    if (isPlaceholder(process.env[varName])) {
      console.log(`  ❌ ${varName} - NOT SET (sending is on but there is no transport)`);
      hasErrors = true;
    } else {
      console.log(`  ✅ ${varName} - Set`);
    }
  });

  if (isPlaceholder(process.env.OUTREACH_POSTAL_ADDRESS)) {
    console.log('  ❌ OUTREACH_POSTAL_ADDRESS - NOT SET (legally required in every footer)');
    hasErrors = true;
  } else {
    console.log('  ✅ OUTREACH_POSTAL_ADDRESS - Set');
  }

  const primary = String(process.env.RESEND_FROM_DOMAIN || 'finovaos.app').toLowerCase();
  const fromDomain = (String(process.env.OUTREACH_FROM_EMAIL || '').match(/@([^\s>@]+)/) || [])[1];
  if (fromDomain && fromDomain.toLowerCase().replace(/[>"']/g, '') === primary) {
    console.log(`  ❌ OUTREACH_FROM_EMAIL is on ${primary} — the domain that carries your OTP and invoice mail`);
    console.log('     → Register a separate outreach domain. A spam complaint here takes login email down too.');
    hasErrors = true;
  }

  const discovery = ['GOOGLE_PLACES_API_KEY', 'APOLLO_API_KEY'].filter((k) => !isPlaceholder(process.env[k]));
  if (discovery.length === 0) {
    console.log('  ⚠️  No discovery provider set — the pipeline will only produce placeholder prospects');
    hasWarnings = true;
  }
}

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
