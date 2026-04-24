import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

const DEFAULTS = [
  { key: "CASH",       name: "Cash",             description: "Physical cash payments accepted in-store",          category: "OFFLINE", isEnabled: true,  sortOrder: 1 },
  { key: "BANK",       name: "Bank Transfer",     description: "Direct bank-to-bank wire or IBFT transfers",        category: "OFFLINE", isEnabled: true,  sortOrder: 2 },
  { key: "CHEQUE",     name: "Cheque",            description: "Payment by cheque / check",                         category: "OFFLINE", isEnabled: true,  sortOrder: 3 },
  { key: "STRIPE",     name: "Stripe",            description: "Accept cards globally via Stripe checkout",         category: "CARD",    isEnabled: false, sortOrder: 4 },
  { key: "PAYPAL",     name: "PayPal",            description: "PayPal wallet and card payments",                   category: "CARD",    isEnabled: false, sortOrder: 5 },
  { key: "JAZZCASH",   name: "JazzCash",          description: "Pakistan mobile wallet — JazzCash",                 category: "MOBILE",  isEnabled: false, sortOrder: 6 },
  { key: "EASYPAISA",  name: "EasyPaisa",         description: "Pakistan mobile wallet — EasyPaisa",                category: "MOBILE",  isEnabled: false, sortOrder: 7 },
  { key: "SADAD",      name: "SADAD",             description: "Saudi Arabia bill payment system",                  category: "MOBILE",  isEnabled: false, sortOrder: 8 },
  { key: "RAZORPAY",   name: "Razorpay",          description: "India — cards, UPI, netbanking, wallets",           category: "CARD",    isEnabled: false, sortOrder: 9 },
  { key: "CRYPTO",     name: "Cryptocurrency",    description: "Bitcoin, ETH, USDT and other crypto payments",      category: "CRYPTO",  isEnabled: false, sortOrder: 10 },
];

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    let gateways = await prisma.adminPaymentGateway.findMany({
      orderBy: [{ sortOrder: "asc" }],
    });

    if (gateways.length === 0) {
      await prisma.adminPaymentGateway.createMany({ data: DEFAULTS });
      gateways = await prisma.adminPaymentGateway.findMany({
        orderBy: [{ sortOrder: "asc" }],
      });
    }

    const total   = gateways.length;
    const enabled = gateways.filter((g) => g.isEnabled).length;
    const byCategory = gateways.reduce<Record<string, number>>((acc, g) => {
      acc[g.category] = (acc[g.category] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ gateways, stats: { total, enabled, byCategory } });
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
    if (body.isEnabled   !== undefined) data.isEnabled   = Boolean(body.isEnabled);
    if (body.name        !== undefined) data.name        = String(body.name).trim();
    if (body.description !== undefined) data.description = String(body.description).trim();
    if (body.configJson  !== undefined) data.configJson  = body.configJson ? JSON.stringify(body.configJson) : null;
    const gateway = await prisma.adminPaymentGateway.update({ where: { id }, data });
    return NextResponse.json({ gateway });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
