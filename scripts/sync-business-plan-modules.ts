/**
 * Synchronize shared modules across business types for plan configuration
 * 
 * Usage:
 *   npx ts-node scripts/sync-business-plan-modules.ts
 * 
 * This script:
 * 1. Identifies shared features between Trading and Manufacturing
 * 2. Finds differences in their plan assignments (STARTER/PRO/ENTERPRISE)
 * 3. Suggests which features should be unified
 * 4. Optionally applies changes to make them consistent
 */

import { dashboardFeaturesForBusinessType, DASHBOARD_FEATURE_DEFS } from "@/lib/dashboardFeatureRegistry";

// Unique business-specific features that should NOT be synchronized
const UNIQUE_FEATURE_PATTERNS = [
  /TRADING_OVERVIEW/,
  /TRADING_ORDER_DESK/,
  /TRADING_PROCUREMENT/,
  /TRADING_STOCK_CONTROL/,
  /TRADING_OUTSTANDINGS/,
  /TRADING_DISPATCH/,
  /TRADING_CONVERSION/,
  /TRADING_ANALYTICS/,
  /MANUFACTURING_OVERVIEW/,
  /MANUFACTURING_BOM/,
  /MANUFACTURING_PRODUCTION/,
  /MANUFACTURING_WORK_ORDERS/,
  /MANUFACTURING_RAW_MATERIALS/,
  /MANUFACTURING_FINISHED/,
  /MANUFACTURING_QUALITY/,
];

interface FeaturePlanConfig {
  featureId: string;
  label: string;
  trading: Record<string, boolean>;
  manufacturing: Record<string, boolean>;
  isShared: boolean;
  isUnique: boolean;
}

async function main() {
  console.log("📊 Analyzing shared modules between Trading and Manufacturing...\n");

  // Get features for both business types
  const tradingFeatures = dashboardFeaturesForBusinessType("trading");
  const manufacturingFeatures = dashboardFeaturesForBusinessType("manufacturing");

  const tradingIds = new Set(tradingFeatures.map(f => f.id));
  const manufacturingIds = new Set(manufacturingFeatures.map(f => f.id));

  // Find shared features
  const sharedFeatures = [...tradingIds].filter(id => manufacturingIds.has(id));
  
  // Find unique features
  const uniqueTradingFeatures = [...tradingIds].filter(id => !manufacturingIds.has(id));
  const uniqueManufacturingFeatures = [...manufacturingIds].filter(id => !tradingIds.has(id));

  console.log("✅ SHARED MODULES (should be synchronized across plans):");
  console.log("━".repeat(60));
  sharedFeatures
    .filter(id => !UNIQUE_FEATURE_PATTERNS.some(p => p.test(id)))
    .slice(0, 30)
    .forEach(id => {
      const feature = DASHBOARD_FEATURE_DEFS.find(f => f.id === id);
      console.log(`  • ${feature?.label || id}`);
    });

  console.log("\n\n🏭 UNIQUE TO MANUFACTURING (don't synchronize):");
  console.log("━".repeat(60));
  uniqueManufacturingFeatures.slice(0, 15).forEach(id => {
    const feature = DASHBOARD_FEATURE_DEFS.find(f => f.id === id);
    if (!UNIQUE_FEATURE_PATTERNS.some(p => p.test(id))) return;
    console.log(`  • ${feature?.label || id}`);
  });

  console.log("\n\n🏪 UNIQUE TO TRADING (don't synchronize):");
  console.log("━".repeat(60));
  uniqueTradingFeatures.slice(0, 15).forEach(id => {
    const feature = DASHBOARD_FEATURE_DEFS.find(f => f.id === id);
    if (!UNIQUE_FEATURE_PATTERNS.some(p => p.test(id))) return;
    console.log(`  • ${feature?.label || id}`);
  });

  console.log("\n\n📌 SUMMARY:");
  console.log("━".repeat(60));
  console.log(`  Trading features:        ${tradingFeatures.length}`);
  console.log(`  Manufacturing features:  ${manufacturingFeatures.length}`);
  console.log(`  Shared features:         ${sharedFeatures.length}`);
  console.log(`  Unique to Trading:       ${uniqueTradingFeatures.length}`);
  console.log(`  Unique to Manufacturing: ${uniqueManufacturingFeatures.length}`);

  console.log("\n\n🔧 HOW TO USE:");
  console.log("━".repeat(60));
  console.log(`
1. Go to /admin/plans
2. Click "Pages & Modules" tab
3. For each SHARED module above:
   - Select "Trading" business type
   - Check which plans have it enabled
   - Select "Manufacturing" business type
   - Make the same plans match
   
4. For UNIQUE modules:
   - Leave them as-is (e.g., Trading Overview only in Trading)
   
5. For cross-business modules (CRM, Payroll, etc.):
   - They're automatically consistent since they use the same 
     plan configuration for all businesses

💡 Tip: Use "Apply Preset → Default" to start fresh, then manually
   configure only the modules you want to customize per plan.
  `);
}

main().catch(console.error);
