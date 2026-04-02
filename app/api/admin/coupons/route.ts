import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const prismaAny = prisma as any;

function isAdmin(req: NextRequest): boolean {
  return req.headers.get("x-user-role") === "ADMIN";
}

/** Parse a JSON array string safely, return null if empty/null */
function parseJsonArray(val: string | null | undefined): string[] | null {
  if (!val || val.trim() === "" || val.trim() === "[]") return null;
  try {
    const arr = JSON.parse(val);
    return Array.isArray(arr) && arr.length > 0 ? arr : null;
  } catch {
    return null;
  }
}

/** Normalise a comma-separated or JSON input into a stored JSON array string (or null) */
function normaliseList(input: string | null | undefined): string | null {
  if (!input || input.trim() === "") return null;
  // Already looks like a JSON array
  if (input.trim().startsWith("[")) {
    const parsed = parseJsonArray(input);
    return parsed ? JSON.stringify(parsed) : null;
  }
  // Treat as comma-separated
  const items = input.split(",").map(s => s.trim()).filter(Boolean);
  return items.length > 0 ? JSON.stringify(items) : null;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    return NextResponse.json({ coupons });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      code, type, value, maxUses, expiresAt, applicableTo, active,
      allowedEmails, allowedCompanyIds, allowedBusinessTypes, allowedCountries,
    } = body as {
      code: string;
      type: string;
      value: number;
      maxUses?: number;
      expiresAt?: string;
      applicableTo?: string;
      active?: boolean;
      allowedEmails?: string;
      allowedCompanyIds?: string;
      allowedBusinessTypes?: string;
      allowedCountries?: string;
    };

    if (!code || !type || value === undefined || value === null) {
      return NextResponse.json(
        { error: "code, type, and value are required" },
        { status: 400 }
      );
    }

    const normalizedCode = code.toUpperCase().trim();

    const existing = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
    if (existing) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });
    }

    const coupon = await prismaAny.coupon.create({
      data: {
        code: normalizedCode,
        type,
        value,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        applicableTo: applicableTo || null,
        active: active ?? true,
        allowedEmails:        normaliseList(allowedEmails),
        allowedCompanyIds:    normaliseList(allowedCompanyIds),
        allowedBusinessTypes: normaliseList(allowedBusinessTypes),
        allowedCountries:     normaliseList(allowedCountries),
      },
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      id, active,
      allowedEmails, allowedCompanyIds, allowedBusinessTypes, allowedCountries,
    } = body as {
      id: string;
      active?: boolean;
      allowedEmails?: string | null;
      allowedCompanyIds?: string | null;
      allowedBusinessTypes?: string | null;
      allowedCountries?: string | null;
    };

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, any> = {};
    if (active !== undefined) data.active = active;
    if (allowedEmails        !== undefined) data.allowedEmails        = normaliseList(allowedEmails);
    if (allowedCompanyIds    !== undefined) data.allowedCompanyIds    = normaliseList(allowedCompanyIds);
    if (allowedBusinessTypes !== undefined) data.allowedBusinessTypes = normaliseList(allowedBusinessTypes);
    if (allowedCountries     !== undefined) data.allowedCountries     = normaliseList(allowedCountries);

    const coupon = await prismaAny.coupon.update({ where: { id }, data });

    return NextResponse.json({ coupon });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
    }

    await prisma.coupon.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
