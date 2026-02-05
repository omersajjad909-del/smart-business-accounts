import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  try {
    const companies = await prisma.userCompany.findMany({
      where: { userId },
      include: { company: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      companies.map((c) => ({
        id: c.companyId,
        name: c.company?.name,
        code: c.company?.code,
        isDefault: c.isDefault,
      }))
    );
  } catch (e) {
    console.error("COMPANIES GET ERROR:", e);
    return NextResponse.json({ error: "Failed to load companies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");
  if (!userId || !role) {
    return NextResponse.json({ error: "User headers required" }, { status: 400 });
  }
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, code } = body;
    if (!name) {
      return NextResponse.json({ error: "Company name required" }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: { name, code: code || null, isActive: true },
    });

    await prisma.userCompany.create({
      data: { userId, companyId: company.id, isDefault: false },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (e: any) {
    console.error("COMPANIES POST ERROR:", e);
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
