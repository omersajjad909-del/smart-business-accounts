import fs from "fs";
for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
import { resolveLemonVariantId, createLemonCheckout } from "@/lib/lemonsqueezy";
import {
  getCustomPlanCycleAmountUsd,
  getCustomModulesMonthlyTotalPkr,
} from "@/lib/customPlanPricing";

const PICK = ["accounting", "inventory"]; // Accounting + Inventory

(async () => {
  console.log("=== 1. Variant resolution ===");
  for (const cycle of ["MONTHLY", "YEARLY"] as const) {
    for (const pk of [false, true]) {
      console.log(
        `  CUSTOM ${cycle.padEnd(7)} pk=${String(pk).padEnd(5)} -> variant`,
        resolveLemonVariantId("CUSTOM", cycle, pk) || "(none)",
      );
    }
  }

  console.log("\n=== 2. Price the app computes for [accounting, inventory] ===");
  const usdM = getCustomPlanCycleAmountUsd(PICK, "MONTHLY");
  const usdY = getCustomPlanCycleAmountUsd(PICK, "YEARLY");
  const pkrM = getCustomModulesMonthlyTotalPkr(PICK);
  console.log("  USD monthly cycle amount:", "$" + usdM);
  console.log("  USD yearly  cycle amount:", "$" + usdY);
  console.log("  PKR monthly (what /pricing shows a PK visitor): Rs", pkrM?.toLocaleString());
  console.log("  -> PK customer sees Rs", pkrM?.toLocaleString(), "but would be charged $" + usdM,
    "= Rs", (usdM * 278).toLocaleString());

  console.log("\n=== 3. Real Lemon Squeezy checkout (no charge) ===");
  const co = await createLemonCheckout({
    planCode: "CUSTOM",
    billingCycle: "MONTHLY",
    successUrl: "https://www.usefinova.app/dashboard/billing?upgrade=success",
    cancelUrl: "https://www.usefinova.app/dashboard/billing?cancel=1",
    companyId: "diagnostic-test",
    userId: null,
    email: null,
    name: "Diagnostic",
    customPriceUsd: usdM,
    displayCurrency: "USD",
    displayCountry: "US",
  });
  console.log("  checkout URL:", co.checkoutUrl);
  process.exit(0);
})().catch((e) => { console.error("ERR", e?.message || e); process.exit(1); });
