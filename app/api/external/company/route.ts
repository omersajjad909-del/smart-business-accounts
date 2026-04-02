import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiSession, unauthResponse, enforceApiPlan } from "../_auth";

export async function GET(req: NextRequest) {
  try {
    const session = await resolveApiSession(req);
    if (!session) return unauthResponse();

    const blocked = enforceApiPlan(session, "GET");
    if (blocked) return blocked;

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: {
        id: true, name: true, code: true,
        country: true, baseCurrency: true,
        plan: true, subscriptionStatus: true,
        createdAt: true,
      },
    });

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    await prisma.activityLog.create({
      data: {
        action: "API_KEY_USED",
        companyId: session.companyId,
        details: JSON.stringify({ keyId: session.keyId, endpoint: "/api/external/company" }),
      },
    }).catch(() => {});

    return NextResponse.json({
      company,
      apiKey: { id: session.keyId, name: session.name },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch company profile" }, { status: 500 });
  }
}
