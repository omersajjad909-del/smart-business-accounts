import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import {
  ensureAdminPaymentGatewayTable,
  syncAdminPaymentGatewayDefaults,
} from "@/lib/adminPaymentGateways";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const gateways = await syncAdminPaymentGatewayDefaults();
    const total = gateways.length;
    const enabled = gateways.filter((gateway) => gateway.isEnabled).length;
    const byCategory = gateways.reduce<Record<string, number>>((accumulator, gateway) => {
      accumulator[gateway.category] = (accumulator[gateway.category] || 0) + 1;
      return accumulator;
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
    await ensureAdminPaymentGatewayTable();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.isEnabled !== undefined) data.isEnabled = Boolean(body.isEnabled);
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.description !== undefined) data.description = String(body.description).trim();
    if (body.configJson !== undefined) data.configJson = body.configJson ? JSON.stringify(body.configJson) : null;
    const gateway = await prisma.adminPaymentGateway.update({ where: { id }, data });
    return NextResponse.json({ gateway });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
