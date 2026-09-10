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

/**
 * Every plan — Starter, Pro, Enterprise — is sold and billed for one company.
 * This endpoint used to let any existing admin self-serve a second, third, …
 * company, each starting on a brand-new free STARTER workspace with its own
 * users/branch/invoice allowance — a free side door around the whole plan
 * model. There is no tier meant to lift this, so it is a flat block rather
 * than another limit table to configure.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Your plan includes one company. Contact support if you need to manage additional businesses." },
    { status: 403 },
  );
}

export async function PUT(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");
  if (!userId || !role) {
    return NextResponse.json({ error: "User headers required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { companyId, setDefault } = body as {
      companyId?: string;
      setDefault?: boolean;
    };

    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const link = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (!link) {
      return NextResponse.json({ error: "User not linked to company" }, { status: 404 });
    }

    if (setDefault) {
      await prisma.$transaction([
        prisma.userCompany.updateMany({
          where: { userId },
          data: { isDefault: false },
        }),
        prisma.userCompany.update({
          where: { userId_companyId: { userId, companyId } },
          data: { isDefault: true },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { defaultCompanyId: companyId },
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("COMPANIES PUT ERROR:", e);
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}
