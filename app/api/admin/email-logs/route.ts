import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const status = searchParams.get("status");

    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const logs = await prisma.emailLog.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
