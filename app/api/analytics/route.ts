import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logActivity } from "@/lib/audit";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function POST(req: NextRequest) {
  try {
    let body: any = null;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
    const name = String(body?.name || "unknown_event");
    const details = body?.details ? String(body.details) : null;
    const userId = req.headers.get("x-user-id");
    const companyId = await resolveCompanyId(req);
    if (companyId) {
      await logActivity(prisma, {
        companyId,
        userId,
        action: `ANALYTICS:${name}`,
        details,
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
