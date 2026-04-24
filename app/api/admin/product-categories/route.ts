import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

const DEFAULTS = [
  { name: "Trading",          description: "Buy and sell goods without manufacturing",   color: "#8b5cf6", sortOrder: 1 },
  { name: "Manufacturing",    description: "Production of goods from raw materials",     color: "#4f7cff", sortOrder: 2 },
  { name: "Service",          description: "Non-physical, skill-based offerings",        color: "#22c55e", sortOrder: 3 },
  { name: "Raw Material",     description: "Base inputs used in production",             color: "#f59e0b", sortOrder: 4 },
  { name: "Finished Goods",   description: "Completed products ready for sale",          color: "#06b6d4", sortOrder: 5 },
  { name: "Retail",           description: "Consumer goods sold directly to public",     color: "#ec4899", sortOrder: 6 },
  { name: "Healthcare",       description: "Medical supplies, equipment, pharma",        color: "#10b981", sortOrder: 7 },
  { name: "Electronics",      description: "Tech hardware and electronic components",    color: "#3b82f6", sortOrder: 8 },
  { name: "Food & Beverage",  description: "Consumable food and drink products",         color: "#f97316", sortOrder: 9 },
  { name: "Construction",     description: "Building materials and hardware",            color: "#64748b", sortOrder: 10 },
];

function isMissingTableError(error: unknown) {
  return !!(
    error &&
    typeof error === "object" &&
    (
      ("code" in error && error.code === "P2021") ||
      ("message" in error && typeof error.message === "string" && error.message.includes("AdminProductCategory"))
    )
  );
}

async function ensureAdminProductCategoryTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."AdminProductCategory" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "color" TEXT NOT NULL DEFAULT '#8b5cf6',
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AdminProductCategory_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "AdminProductCategory_name_key"
    ON "public"."AdminProductCategory"("name");
  `);
}

async function findCategories() {
  try {
    return await prisma.adminProductCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    await ensureAdminProductCategoryTable();
    return prisma.adminProductCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }
}

async function seedDefaultsIfEmpty() {
  const categories = await findCategories();
  if (categories.length > 0) return categories;

  await prisma.adminProductCategory.createMany({
    data: DEFAULTS,
    skipDuplicates: true,
  });

  return findCategories();
}

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const categories = await seedDefaultsIfEmpty();

    const total    = categories.length;
    const active   = categories.filter((c) => c.isActive).length;
    const inactive = total - active;
    return NextResponse.json({ categories, stats: { total, active, inactive } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    await ensureAdminProductCategoryTable();
    const body = await req.json();
    const category = await prisma.adminProductCategory.create({
      data: {
        name:        String(body.name || "").trim(),
        description: body.description ? String(body.description).trim() : null,
        color:       String(body.color || "#8b5cf6"),
        sortOrder:   Number(body.sortOrder || 0),
        isActive:    body.isActive !== false,
      },
    });
    return NextResponse.json({ category });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    await ensureAdminProductCategoryTable();
    const id   = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name        !== undefined) data.name        = String(body.name).trim();
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;
    if (body.color       !== undefined) data.color       = String(body.color);
    if (body.sortOrder   !== undefined) data.sortOrder   = Number(body.sortOrder);
    if (body.isActive    !== undefined) data.isActive    = Boolean(body.isActive);
    const category = await prisma.adminProductCategory.update({ where: { id }, data });
    return NextResponse.json({ category });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    await ensureAdminProductCategoryTable();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await prisma.adminProductCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
