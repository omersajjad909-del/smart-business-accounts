import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      const header = "code,name,debit,credit";
      return new NextResponse(header, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=opening-balances-template.csv",
        },
      });
    }
    const accounts = await prisma.account.findMany({
      where: { companyId },
      select: { code: true, name: true },
      orderBy: { name: "asc" },
    });
    const header = "code,name,debit,credit";
    const rows = accounts.map((a) => [a.code, JSON.stringify(a.name || ""), "0", "0"].join(","));
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=opening-balances-template.csv",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to generate template" }, { status: 500 });
  }
}
