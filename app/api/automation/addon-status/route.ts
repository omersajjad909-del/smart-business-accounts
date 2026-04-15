import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* Lightweight check — dashboard polls this to know if add-on is active */
export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ enabled: false });

    const rows = await prisma.$queryRaw<{ enabled: boolean }[]>`
      SELECT enabled FROM "AutomationAddon"
      WHERE "companyId" = ${companyId}
        AND ("expiresAt" IS NULL OR "expiresAt" > now())
      LIMIT 1
    `.catch(() => []);

    return NextResponse.json({ enabled: rows[0]?.enabled === true });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
