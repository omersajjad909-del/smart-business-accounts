import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

const DEFAULTS = [
  { country: "Pakistan",     countryCode: "PK", taxType: "GST",        name: "Pakistan GST",          code: "PK-GST-17",   rate: 17,  isDefault: true,  description: "General Sales Tax on goods & services" },
  { country: "Pakistan",     countryCode: "PK", taxType: "WHT",        name: "Pakistan WHT",          code: "PK-WHT-10",   rate: 10,  isDefault: false, description: "Withholding Tax on supplier payments" },
  { country: "Pakistan",     countryCode: "PK", taxType: "INCOME_TAX", name: "Pakistan Income Tax",   code: "PK-IT-29",    rate: 29,  isDefault: false, description: "Corporate income tax rate" },
  { country: "UAE",          countryCode: "AE", taxType: "VAT",        name: "UAE VAT",               code: "AE-VAT-5",    rate: 5,   isDefault: false, description: "Value Added Tax introduced in 2018" },
  { country: "Saudi Arabia", countryCode: "SA", taxType: "VAT",        name: "Saudi Arabia VAT",      code: "SA-VAT-15",   rate: 15,  isDefault: false, description: "VAT doubled to 15% in 2020" },
  { country: "India",        countryCode: "IN", taxType: "GST",        name: "India GST Standard",    code: "IN-GST-18",   rate: 18,  isDefault: false, description: "Standard GST rate for most goods" },
  { country: "India",        countryCode: "IN", taxType: "GST",        name: "India GST Reduced",     code: "IN-GST-5",    rate: 5,   isDefault: false, description: "Reduced GST for essentials" },
  { country: "UK",           countryCode: "GB", taxType: "VAT",        name: "UK VAT Standard",       code: "GB-VAT-20",   rate: 20,  isDefault: false, description: "Standard VAT rate" },
  { country: "UK",           countryCode: "GB", taxType: "VAT",        name: "UK VAT Reduced",        code: "GB-VAT-5",    rate: 5,   isDefault: false, description: "Reduced VAT for domestic fuel" },
  { country: "Germany",      countryCode: "DE", taxType: "VAT",        name: "Germany VAT",           code: "DE-VAT-19",   rate: 19,  isDefault: false, description: "Standard Mehrwertsteuer" },
  { country: "USA",          countryCode: "US", taxType: "SALES_TAX",  name: "US Sales Tax (avg)",    code: "US-ST-8",     rate: 8,   isDefault: false, description: "Average combined state+local sales tax" },
  { country: "Canada",       countryCode: "CA", taxType: "GST",        name: "Canada GST",            code: "CA-GST-5",    rate: 5,   isDefault: false, description: "Federal Goods and Services Tax" },
  { country: "Australia",    countryCode: "AU", taxType: "GST",        name: "Australia GST",         code: "AU-GST-10",   rate: 10,  isDefault: false, description: "Goods and Services Tax" },
];

function isMissingTableError(error: unknown) {
  return !!(
    error &&
    typeof error === "object" &&
    (
      ("code" in error && error.code === "P2021") ||
      ("message" in error && typeof error.message === "string" && error.message.includes("AdminTaxPreset"))
    )
  );
}

async function ensureAdminTaxPresetTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."AdminTaxPreset" (
      "id" TEXT NOT NULL,
      "country" TEXT NOT NULL,
      "countryCode" TEXT NOT NULL,
      "region" TEXT,
      "taxType" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "rate" DOUBLE PRECISION NOT NULL,
      "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "description" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AdminTaxPreset_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "AdminTaxPreset_code_key"
    ON "public"."AdminTaxPreset"("code");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AdminTaxPreset_countryCode_isActive_idx"
    ON "public"."AdminTaxPreset"("countryCode", "isActive");
  `);
}

async function findPresets() {
  try {
    return await prisma.adminTaxPreset.findMany({
      orderBy: [{ countryCode: "asc" }, { rate: "desc" }],
    });
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    await ensureAdminTaxPresetTable();
    return prisma.adminTaxPreset.findMany({
      orderBy: [{ countryCode: "asc" }, { rate: "desc" }],
    });
  }
}

async function seedDefaultsIfEmpty() {
  const presets = await findPresets();
  if (presets.length > 0) return presets;

  await prisma.adminTaxPreset.createMany({
    data: DEFAULTS,
    skipDuplicates: true,
  });

  return findPresets();
}

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const presets = await seedDefaultsIfEmpty();

    const total     = presets.length;
    const active    = presets.filter((p) => p.isActive).length;
    const countries = new Set(presets.map((p) => p.countryCode)).size;
    const avgRate   = presets.length ? Math.round(presets.reduce((s, p) => s + p.rate, 0) / presets.length * 10) / 10 : 0;

    return NextResponse.json({ presets, stats: { total, active, countries, avgRate } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    await ensureAdminTaxPresetTable();
    const body = await req.json();
    const preset = await prisma.adminTaxPreset.create({
      data: {
        country:     String(body.country || "").trim(),
        countryCode: String(body.countryCode || "").toUpperCase().trim(),
        region:      body.region ? String(body.region).trim() : null,
        taxType:     String(body.taxType || "GST").toUpperCase(),
        name:        String(body.name || "").trim(),
        code:        String(body.code || "").toUpperCase().trim(),
        rate:        Number(body.rate || 0),
        isDefault:   Boolean(body.isDefault),
        isActive:    body.isActive !== false,
        description: body.description ? String(body.description).trim() : null,
      },
    });
    return NextResponse.json({ preset });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    await ensureAdminTaxPresetTable();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.country     !== undefined) data.country     = String(body.country).trim();
    if (body.countryCode !== undefined) data.countryCode = String(body.countryCode).toUpperCase().trim();
    if (body.region      !== undefined) data.region      = body.region ? String(body.region).trim() : null;
    if (body.taxType     !== undefined) data.taxType     = String(body.taxType).toUpperCase();
    if (body.name        !== undefined) data.name        = String(body.name).trim();
    if (body.rate        !== undefined) data.rate        = Number(body.rate);
    if (body.isDefault   !== undefined) data.isDefault   = Boolean(body.isDefault);
    if (body.isActive    !== undefined) data.isActive    = Boolean(body.isActive);
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;
    const preset = await prisma.adminTaxPreset.update({ where: { id }, data });
    return NextResponse.json({ preset });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    await ensureAdminTaxPresetTable();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await prisma.adminTaxPreset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
