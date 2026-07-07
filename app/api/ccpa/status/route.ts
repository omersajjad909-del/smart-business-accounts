import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/ccpa/status — Check current CCPA opt-out status and compliance info
export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    const userId = req.headers.get("x-user-id");

    if (!companyId || !userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        ccpaOptOut: true,
        ccpaOptOutAt: true,
        country: true,
        preferredLanguage: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const gdprRequests = await prisma.gdprRequest.findMany({
      where: { companyId, userId },
      orderBy: { requestedAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        status: true,
        requestedAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({
      ccpa: {
        optedOut: company.ccpaOptOut,
        optOutDate: company.ccpaOptOutAt,
        rights: [
          "Right to Know — Request information about what personal data we collect",
          "Right to Delete — Request deletion of your personal information",
          "Right to Opt-Out — Stop us from selling or sharing your information",
          "Right to Non-Discrimination — Equal service regardless of privacy choices",
          "Right to Correct — Request correction of inaccurate personal information",
          "Right to Limit Use of Sensitive Information",
        ],
        contact: "privacy@finovaforge.com",
        effectiveDate: "2023-01-01",
      },
      gdpr: {
        applicableIfEU: ["DE", "FR", "ES", "IT", "NL", "BE", "PL", "SE", "AT", "CH"].includes(company.country?.toUpperCase() || ""),
        rights: [
          "Art. 15 — Right of Access",
          "Art. 16 — Right to Rectification",
          "Art. 17 — Right to Erasure",
          "Art. 18 — Right to Restriction of Processing",
          "Art. 20 — Right to Data Portability",
          "Art. 21 — Right to Object",
        ],
        dpo: "privacy@finovaforge.com",
      },
      recentRequests: gdprRequests,
      preferredLanguage: company.preferredLanguage,
    });
  } catch (err: any) {
    console.error("CCPA status error:", err);
    return NextResponse.json({ error: "Failed to fetch compliance status" }, { status: 500 });
  }
}
