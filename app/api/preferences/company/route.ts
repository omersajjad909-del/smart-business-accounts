import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidBrandKey, getBrandPreset } from "@/lib/brandPalette";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Only company admins can update branding" }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const companyId = req.headers.get("x-company-id");
  if (!companyId || companyId === "system") return unauthorized();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, logoUrl: true, brandColor: true },
  });

  const preset = getBrandPreset(company?.brandColor);

  return NextResponse.json({
    name:       company?.name || "",
    logoUrl:    company?.logoUrl || null,
    brandColor: preset.key,
  });
}

export async function PUT(req: NextRequest) {
  const companyId = req.headers.get("x-company-id");
  const role      = req.headers.get("x-user-role");
  if (!companyId || companyId === "system") return unauthorized();
  if (String(role).toUpperCase() !== "ADMIN") return forbidden();

  const body = await req.json().catch(() => ({}));
  const brandColor = String(body?.brandColor || "").trim();
  const name       = typeof body?.name === "string" ? body.name.trim() : null;

  const data: Record<string, string> = {};
  if (brandColor && isValidBrandKey(brandColor)) data.brandColor = brandColor;
  if (name && name.length > 0 && name.length <= 120) data.name = name;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const company = await prisma.company.update({
    where: { id: companyId },
    data,
    select: { name: true, logoUrl: true, brandColor: true },
  });

  return NextResponse.json({
    name:       company.name,
    logoUrl:    company.logoUrl,
    brandColor: getBrandPreset(company.brandColor).key,
  });
}
