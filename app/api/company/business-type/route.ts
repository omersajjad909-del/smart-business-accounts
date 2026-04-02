import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { businessType: true, businessSetupDone: true, name: true },
    });
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(company);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });
    const body = await req.json();
    const { businessType, businessSetupDone } = body;
    const data: any = {};
    if (businessType) data.businessType = businessType;
    if (businessSetupDone !== undefined) data.businessSetupDone = businessSetupDone;
    const company = await prisma.company.update({ where: { id: companyId }, data });
    return NextResponse.json({ success: true, businessType: company.businessType, businessSetupDone: company.businessSetupDone });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
