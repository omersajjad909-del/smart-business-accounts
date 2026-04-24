import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

const DEFAULTS = [
  { code: "USD", name: "US Dollar",        symbol: "$",   flag: "🇺🇸", isEnabled: true,  isDefault: true,  exchangeRate: 1.0    },
  { code: "EUR", name: "Euro",             symbol: "€",   flag: "🇪🇺", isEnabled: true,  isDefault: false, exchangeRate: 0.93   },
  { code: "GBP", name: "British Pound",    symbol: "£",   flag: "🇬🇧", isEnabled: true,  isDefault: false, exchangeRate: 0.79   },
  { code: "PKR", name: "Pakistani Rupee",  symbol: "₨",   flag: "🇵🇰", isEnabled: true,  isDefault: false, exchangeRate: 278.5  },
  { code: "AED", name: "UAE Dirham",       symbol: "د.إ", flag: "🇦🇪", isEnabled: true,  isDefault: false, exchangeRate: 3.67   },
  { code: "SAR", name: "Saudi Riyal",      symbol: "ر.س", flag: "🇸🇦", isEnabled: true,  isDefault: false, exchangeRate: 3.75   },
  { code: "INR", name: "Indian Rupee",     symbol: "₹",   flag: "🇮🇳", isEnabled: true,  isDefault: false, exchangeRate: 83.1   },
  { code: "JPY", name: "Japanese Yen",     symbol: "¥",   flag: "🇯🇵", isEnabled: true,  isDefault: false, exchangeRate: 149.8  },
  { code: "CNY", name: "Chinese Yuan",     symbol: "¥",   flag: "🇨🇳", isEnabled: false, isDefault: false, exchangeRate: 7.24   },
  { code: "CAD", name: "Canadian Dollar",  symbol: "$",   flag: "🇨🇦", isEnabled: false, isDefault: false, exchangeRate: 1.36   },
  { code: "AUD", name: "Australian Dollar",symbol: "$",   flag: "🇦🇺", isEnabled: false, isDefault: false, exchangeRate: 1.53   },
  { code: "TRY", name: "Turkish Lira",     symbol: "₺",   flag: "🇹🇷", isEnabled: false, isDefault: false, exchangeRate: 32.1   },
];

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    let currencies = await prisma.platformCurrency.findMany({
      orderBy: [{ isDefault: "desc" }, { isEnabled: "desc" }, { code: "asc" }],
    });

    if (currencies.length === 0) {
      await prisma.platformCurrency.createMany({ data: DEFAULTS });
      currencies = await prisma.platformCurrency.findMany({
        orderBy: [{ isDefault: "desc" }, { isEnabled: "desc" }, { code: "asc" }],
      });
    }

    const total    = currencies.length;
    const enabled  = currencies.filter((c) => c.isEnabled).length;
    const disabled = total - enabled;
    const defaultCurrency = currencies.find((c) => c.isDefault);

    return NextResponse.json({ currencies, stats: { total, enabled, disabled, defaultCode: defaultCurrency?.code || "USD" } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const body = await req.json();
    const currency = await prisma.platformCurrency.create({
      data: {
        code:         String(body.code || "").toUpperCase().trim(),
        name:         String(body.name || "").trim(),
        symbol:       String(body.symbol || "").trim(),
        flag:         body.flag ? String(body.flag).trim() : null,
        isEnabled:    body.isEnabled !== false,
        isDefault:    Boolean(body.isDefault),
        rateSource:   body.rateSource || "MANUAL",
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
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name         !== undefined) data.name         = String(body.name).trim();
    if (body.symbol       !== undefined) data.symbol       = String(body.symbol).trim();
    if (body.flag         !== undefined) data.flag         = body.flag || null;
    if (body.isEnabled    !== undefined) data.isEnabled    = Boolean(body.isEnabled);
    if (body.isDefault    !== undefined) data.isDefault    = Boolean(body.isDefault);
    if (body.rateSource   !== undefined) data.rateSource   = String(body.rateSource);
    if (body.exchangeRate !== undefined) data.exchangeRate = Number(body.exchangeRate);

    // If setting as default, clear all others first
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
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const cur = await prisma.platformCurrency.findUnique({ where: { id } });
    if (cur?.isDefault) return NextResponse.json({ error: "Cannot delete the default currency" }, { status: 400 });
    await prisma.platformCurrency.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
