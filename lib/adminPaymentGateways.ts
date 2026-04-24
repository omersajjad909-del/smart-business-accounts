import { prisma } from "@/lib/prisma";

export type AdminPaymentGatewaySeed = {
  key: string;
  name: string;
  description: string;
  category: string;
  isEnabled: boolean;
  sortOrder: number;
};

export const ADMIN_PAYMENT_GATEWAY_DEFAULTS: AdminPaymentGatewaySeed[] = [
  { key: "CASH", name: "Cash", description: "Physical cash payments accepted in-store", category: "OFFLINE", isEnabled: true, sortOrder: 1 },
  { key: "BANK", name: "Bank Transfer", description: "Direct bank-to-bank wire or IBFT transfers", category: "OTHER", isEnabled: true, sortOrder: 2 },
  { key: "CHEQUE", name: "Cheque", description: "Payment by cheque or check", category: "OFFLINE", isEnabled: true, sortOrder: 3 },
  { key: "STRIPE", name: "Card", description: "Credit and debit card checkout", category: "CARD", isEnabled: true, sortOrder: 4 },
  { key: "PAYPAL", name: "PayPal", description: "PayPal wallet and linked card payments", category: "CARD", isEnabled: true, sortOrder: 5 },
  { key: "APPLEPAY", name: "Apple Pay", description: "Apple wallet checkout for supported devices", category: "CARD", isEnabled: true, sortOrder: 6 },
  { key: "GOOGLEPAY", name: "Google Pay", description: "Google wallet checkout for supported devices", category: "CARD", isEnabled: true, sortOrder: 7 },
  { key: "ACH", name: "ACH Transfer", description: "US bank debit and account transfer", category: "OTHER", isEnabled: true, sortOrder: 8 },
  { key: "SEPA", name: "SEPA Transfer", description: "European bank transfer", category: "OTHER", isEnabled: true, sortOrder: 9 },
  { key: "JAZZCASH", name: "JazzCash", description: "Pakistan mobile wallet - JazzCash", category: "MOBILE", isEnabled: true, sortOrder: 10 },
  { key: "EASYPAISA", name: "Easypaisa", description: "Pakistan mobile wallet - Easypaisa", category: "MOBILE", isEnabled: true, sortOrder: 11 },
  { key: "SADAD", name: "SADAD", description: "Saudi Arabia bill payment system", category: "MOBILE", isEnabled: true, sortOrder: 12 },
  { key: "RAZORPAY", name: "Razorpay", description: "India cards, UPI, netbanking, wallets", category: "CARD", isEnabled: true, sortOrder: 13 },
  { key: "CRYPTO", name: "Cryptocurrency", description: "Bitcoin, ETH, USDT and other crypto payments", category: "CRYPTO", isEnabled: true, sortOrder: 14 },
  { key: "KLARNA", name: "Klarna / BNPL", description: "Buy now, pay later installments", category: "OTHER", isEnabled: true, sortOrder: 15 },
];

export const GATEWAY_METHOD_MAP: Record<string, string[]> = {
  STRIPE: ["card"],
  PAYPAL: ["paypal"],
  APPLEPAY: ["applepay"],
  GOOGLEPAY: ["googlepay"],
  BANK: ["bank"],
  ACH: ["ach"],
  SEPA: ["sepa"],
  JAZZCASH: ["jazzcash"],
  EASYPAISA: ["easypaisa"],
  CRYPTO: ["crypto"],
  KLARNA: ["klarna"],
};

export function isMissingAdminPaymentGatewayTableError(error: unknown) {
  return !!(
    error &&
    typeof error === "object" &&
    (
      ("code" in error && error.code === "P2021") ||
      ("message" in error && typeof error.message === "string" && error.message.includes("AdminPaymentGateway"))
    )
  );
}

export async function ensureAdminPaymentGatewayTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."AdminPaymentGateway" (
      "id" TEXT NOT NULL,
      "key" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "category" TEXT NOT NULL DEFAULT 'OTHER',
      "isEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
      "configJson" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AdminPaymentGateway_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "AdminPaymentGateway_key_key"
    ON "public"."AdminPaymentGateway"("key");
  `);
}

export async function listAdminPaymentGateways() {
  try {
    return await prisma.adminPaymentGateway.findMany({
      orderBy: [{ sortOrder: "asc" }],
    });
  } catch (error) {
    if (!isMissingAdminPaymentGatewayTableError(error)) throw error;
    await ensureAdminPaymentGatewayTable();
    return prisma.adminPaymentGateway.findMany({
      orderBy: [{ sortOrder: "asc" }],
    });
  }
}

export async function syncAdminPaymentGatewayDefaults() {
  const existing = await listAdminPaymentGateways();
  const existingKeys = new Set(existing.map((gateway) => gateway.key));
  const missingKeys = ADMIN_PAYMENT_GATEWAY_DEFAULTS
    .filter((gateway) => !existingKeys.has(gateway.key))
    .map((gateway) => gateway.key);

  if (missingKeys.length > 0) {
    await prisma.adminPaymentGateway.createMany({
      data: ADMIN_PAYMENT_GATEWAY_DEFAULTS.filter((gateway) => missingKeys.includes(gateway.key)),
      skipDuplicates: true,
    });
  }

  const needsLegacyUpgrade = missingKeys.length > 0;
  if (needsLegacyUpgrade) {
    await prisma.adminPaymentGateway.updateMany({
      where: { key: { in: ADMIN_PAYMENT_GATEWAY_DEFAULTS.map((gateway) => gateway.key) } },
      data: { isEnabled: true },
    });
  }

  return listAdminPaymentGateways();
}

export async function listEnabledCheckoutMethodIds() {
  const gateways = await syncAdminPaymentGatewayDefaults();
  const methodIds = gateways
    .filter((gateway) => gateway.isEnabled)
    .flatMap((gateway) => GATEWAY_METHOD_MAP[gateway.key] || []);

  return Array.from(new Set(methodIds));
}
