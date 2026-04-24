import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

const DEFAULTS = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "US", isEnabled: true, isDefault: true, exchangeRate: 1.0 },
  { code: "EUR", name: "Euro", symbol: "EUR", flag: "EU", isEnabled: true, isDefault: false, exchangeRate: 0.93 },
  { code: "GBP", name: "British Pound", symbol: "GBP", flag: "GB", isEnabled: true, isDefault: false, exchangeRate: 0.79 },
  { code: "PKR", name: "Pakistani Rupee", symbol: "PKR", flag: "PK", isEnabled: true, isDefault: false, exchangeRate: 278.5 },
  { code: "AED", name: "UAE Dirham", symbol: "AED", flag: "AE", isEnabled: true, isDefault: false, exchangeRate: 3.67 },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR", flag: "SA", isEnabled: true, isDefault: false, exchangeRate: 3.75 },
  { code: "INR", name: "Indian Rupee", symbol: "INR", flag: "IN", isEnabled: true, isDefault: false, exchangeRate: 83.1 },
  { code: "JPY", name: "Japanese Yen", symbol: "JPY", flag: "JP", isEnabled: true, isDefault: false, exchangeRate: 149.8 },
  { code: "CNY", name: "Chinese Yuan", symbol: "CNY", flag: "CN", isEnabled: false, isDefault: false, exchangeRate: 7.24 },
  { code: "CAD", name: "Canadian Dollar", symbol: "CAD", flag: "CA", isEnabled: false, isDefault: false, exchangeRate: 1.36 },
  { code: "AUD", name: "Australian Dollar", symbol: "AUD", flag: "AU", isEnabled: false, isDefault: false, exchangeRate: 1.53 },
  { code: "TRY", name: "Turkish Lira", symbol: "TRY", flag: "TR", isEnabled: false, isDefault: false, exchangeRate: 32.1 },
];

function isMissingTableError(error: unknown) {
  return !!(
    error &&
    typeof error === "object" &&
    (
      ("code" in error && error.code === "P2021") ||
      ("message" in error && typeof error.message === "string" && error.message.includes("PlatformCurrency"))
    )
  );
}

async function ensurePlatformCurrencyTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."PlatformCurrency" (
      "id" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "symbol" TEXT NOT NULL,
      "flag" TEXT,
      "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
      "rateSource" TEXT NOT NULL DEFAULT 'MANUAL',
      "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlatformCurrency_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "PlatformCurrency_code_key"
    ON "public"."PlatformCurrency"("code");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PlatformCurrency_isEnabled_idx"
    ON "public"."PlatformCurrency"("isEnabled");
  `);
}

async function findCurrencies() {
  try {
    return await prisma.platformCurrency.findMany({
      orderBy: [{ isDefault: "desc" }, { isEnabled: "desc" }, { code: "asc" }],
    });
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    await ensurePlatformCurrencyTable();
    return prisma.platformCurrency.findMany({
      orderBy: [{ isDefault: "desc" }, { isEnabled: "desc" }, { code: "asc" }],
    });
  }
}

async function seedDefaultsIfEmpty() {
  const currencies = await findCurrencies();
  if (currencies.length > 0) return currencies;

  await prisma.platformCurrency.createMany({
    data: DEFAULTS,
    skipDuplicates: true,
  });

  return findCurrencies();
}

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const currencies = await seedDefaultsIfEmpty();

    const total = currencies.length;
    const enabled = currencies.filter((currency) => currency.isEnabled).length;
    const disabled = total - enabled;
    const defaultCurrency = currencies.find((currency) => currency.isDefault);

    return NextResponse.json({
      currencies,
      stats: { total, enabled, disabled, defaultCode: defaultCurrency?.code || "USD" },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    await ensurePlatformCurrencyTable();
    const body = await req.json();
    const currency = await prisma.platformCurrency.create({
      data: {
        code: String(body.code || "").toUpperCase().trim(),
        name: String(body.name || "").trim(),
        symbol: String(body.symbol || "").trim(),
        flag: body.flag ? String(body.flag).trim() : null,
        isEnabled: body.isEnabled !== false,
        isDefault: Boolean(body.isDefault),
        rateSource: body.rateSource || "MANUAL",
        exchangeRate: Number(body.exchangeRate || 1),
      },
    });
    return NextResponse.json({ currency });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    await ensurePlatformCurrencyTable();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.symbol !== undefined) data.symbol = String(body.symbol).trim();
    if (body.flag !== undefined) data.flag = body.flag || null;
    if (body.isEnabled !== undefined) data.isEnabled = Boolean(body.isEnabled);
    if (body.isDefault !== undefined) data.isDefault = Boolean(body.isDefault);
    if (body.rateSource !== undefined) data.rateSource = String(body.rateSource);
    if (body.exchangeRate !== undefined) data.exchangeRate = Number(body.exchangeRate);

    if (body.isDefault === true) {
      await prisma.platformCurrency.updateMany({ data: { isDefault: false } });
    }

    const currency = await prisma.platformCurrency.update({ where: { id }, data });
    return NextResponse.json({ currency });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    await ensurePlatformCurrencyTable();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const currency = await prisma.platformCurrency.findUnique({ where: { id } });
    if (currency?.isDefault) {
      return NextResponse.json({ error: "Cannot delete the default currency" }, { status: 400 });
    }
    await prisma.platformCurrency.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
