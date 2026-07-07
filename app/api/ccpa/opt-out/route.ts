import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

// POST /api/ccpa/opt-out — CCPA "Do Not Sell or Share My Personal Information"
export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    const userId = req.headers.get("x-user-id");

    if (!companyId || !userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, ccpaOptOut: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company.ccpaOptOut) {
      return NextResponse.json({
        message: "CCPA opt-out is already active for this account.",
        optedOut: true,
      });
    }

    await prisma.company.update({
      where: { id: companyId },
      data: {
        ccpaOptOut: true,
        ccpaOptOutAt: new Date(),
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: "CCPA Opt-Out Confirmed — FinovaOS",
        html: `
          <p>Dear ${user.name},</p>
          <p>Your <strong>CCPA opt-out</strong> request has been processed successfully for <strong>${company.name}</strong>.</p>
          <p><strong>What this means:</strong></p>
          <ul>
            <li>We will not sell or share your personal information with third parties for cross-context behavioral advertising</li>
            <li>Your data will only be used to provide the FinovaOS services you have contracted for</li>
            <li>This preference is effective immediately</li>
          </ul>
          <p>Under the <strong>California Consumer Privacy Act (CCPA)</strong> and <strong>CPRA</strong>, you have the right to opt out of the sale or sharing of your personal information.</p>
          <p>Opt-out date: <strong>${new Date().toISOString().slice(0, 10)}</strong></p>
          <p>If you have questions, contact <a href="mailto:privacy@finovaforge.com">privacy@finovaforge.com</a></p>
          <hr>
          <p style="font-size:12px;color:#666;">Finova Forge | CCPA Privacy Rights | California Consumer Privacy Act</p>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "CCPA opt-out confirmed. We will not sell or share your personal information.",
      optedOut: true,
      effectiveDate: new Date().toISOString().slice(0, 10),
    });
  } catch (err: any) {
    console.error("CCPA opt-out error:", err);
    return NextResponse.json({ error: "Failed to process CCPA opt-out" }, { status: 500 });
  }
}

// DELETE /api/ccpa/opt-out — Opt back in
export async function DELETE(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    const userId = req.headers.get("x-user-id");

    if (!companyId || !userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    await prisma.company.update({
      where: { id: companyId },
      data: { ccpaOptOut: false, ccpaOptOutAt: null },
    });

    return NextResponse.json({
      success: true,
      message: "CCPA opt-out has been removed. You have opted back in to standard data processing.",
      optedOut: false,
    });
  } catch (err: any) {
    console.error("CCPA opt-in error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
