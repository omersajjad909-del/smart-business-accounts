import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function mask(val: string) {
  if (!val || val.startsWith("your_") || val === "") return null;
  if (val.length <= 8) return "****";
  return val.slice(0, 4) + "****" + val.slice(-4);
}

function isSet(val: string) {
  return Boolean(val && !val.startsWith("your_") && val !== "");
}

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const apiKey     = env("LEMONSQUEEZY_API_KEY");
  const storeId    = env("LEMONSQUEEZY_STORE_ID");
  const webhookSec = env("LEMONSQUEEZY_WEBHOOK_SECRET");
  const testMode   = env("LEMONSQUEEZY_TEST_MODE") === "true";

  const variants = {
    STARTER_MONTHLY:    env("LEMONSQUEEZY_VARIANT_STARTER_MONTHLY"),
    STARTER_YEARLY:     env("LEMONSQUEEZY_VARIANT_STARTER_YEARLY"),
    PRO_MONTHLY:        env("LEMONSQUEEZY_VARIANT_PRO_MONTHLY"),
    PRO_YEARLY:         env("LEMONSQUEEZY_VARIANT_PRO_YEARLY"),
    ENTERPRISE_MONTHLY: env("LEMONSQUEEZY_VARIANT_ENTERPRISE_MONTHLY"),
    ENTERPRISE_YEARLY:  env("LEMONSQUEEZY_VARIANT_ENTERPRISE_YEARLY"),
  };

  const configured = isSet(apiKey) && isSet(storeId);
  const webhookConfigured = isSet(webhookSec);
  const variantStatus = Object.fromEntries(
    Object.entries(variants).map(([k, v]) => [k, { set: isSet(v), masked: mask(v) }])
  );
  const variantsConfigured = Object.values(variants).filter(isSet).length;

  return NextResponse.json({
    configured,
    testMode,
    webhookConfigured,
    storeId: mask(storeId),
    apiKeyMasked: mask(apiKey),
    variantStatus,
    variantsConfigured,
    variantsTotal: Object.keys(variants).length,
    launchDiscount: env("LEMONSQUEEZY_LAUNCH_DISCOUNT") || null,
  });
}
