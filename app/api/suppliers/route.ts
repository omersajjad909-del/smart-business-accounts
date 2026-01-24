import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const suppliers = await prisma.account.findMany({
    where: { partyType: "SUPPLIER" },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(suppliers);
}
