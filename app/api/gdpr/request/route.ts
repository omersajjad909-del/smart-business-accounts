import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const VALID_TYPES = ["EXPORT", "DELETE", "RESTRICT", "PORTABILITY"] as const;
type GdprRequestType = typeof VALID_TYPES[number];

// POST /api/gdpr/request — Submit a GDPR data request
export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    const userId = req.headers.get("x-user-id");

    if (!companyId || !userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { type } = body;

    if (!VALID_TYPES.includes(type as GdprRequestType)) {
      return NextResponse.json({
        error: `Invalid request type. Must be one of: ${VALID_TYPES.join(", ")}`,
      }, { status: 400 });
    }

    // Check for existing pending/processing request of same type
    const existing = await prisma.gdprRequest.findFirst({
      where: {
        companyId,
        userId,
        type,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (existing) {
      return NextResponse.json({
        error: "You already have a pending request of this type. Please wait for it to be processed.",
        existingRequestId: existing.id,
        status: existing.status,
      }, { status: 409 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    const gdprRequest = await prisma.gdprRequest.create({
      data: {
        companyId,
        userId,
        type,
        status: "PENDING",
        ipAddress,
        userAgent,
      },
    });

    // Notify the user by email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (user?.email) {
      const typeLabels: Record<GdprRequestType, string> = {
        EXPORT: "Data Export",
        DELETE: "Right to Erasure (Deletion)",
        RESTRICT: "Restriction of Processing",
        PORTABILITY: "Data Portability",
      };

      await sendEmail({
        to: user.email,
        subject: `GDPR Request Received — ${typeLabels[type as GdprRequestType]}`,
        html: `
          <p>Dear ${user.name},</p>
          <p>We have received your GDPR <strong>${typeLabels[type as GdprRequestType]}</strong> request (ID: <code>${gdprRequest.id}</code>).</p>
          <p>Under GDPR Article 12, we will respond within <strong>30 days</strong>. For deletion requests, we may retain certain data for legal compliance purposes as permitted by GDPR Article 17(3).</p>
          <p>Our team will review your request and contact you at this email address with the outcome.</p>
          <p>If you have any questions, please contact us at <a href="mailto:privacy@finovaforge.com">privacy@finovaforge.com</a></p>
          <p>Reference number: <strong>${gdprRequest.id}</strong></p>
          <p>Request date: ${new Date().toISOString().slice(0, 10)}</p>
          <hr>
          <p style="font-size:12px;color:#666;">This email confirms receipt of your data subject request under the General Data Protection Regulation (GDPR). Finova Forge, Faisalabad, Pakistan.</p>
        `,
      }).catch(() => {});
    }

    // Notify admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `[GDPR] New ${type} Request from ${user?.email || userId}`,
        html: `
          <p>A new GDPR request has been submitted.</p>
          <ul>
            <li>Type: <strong>${type}</strong></li>
            <li>User: ${user?.email || userId}</li>
            <li>Company ID: ${companyId}</li>
            <li>Request ID: ${gdprRequest.id}</li>
            <li>Submitted: ${new Date().toISOString()}</li>
          </ul>
          <p>Please review and process this request in the admin panel within 30 days.</p>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      requestId: gdprRequest.id,
      type,
      status: "PENDING",
      message: "Your GDPR request has been received. We will respond within 30 days.",
    }, { status: 201 });
  } catch (err: any) {
    console.error("GDPR request error:", err);
    return NextResponse.json({ error: "Failed to submit GDPR request" }, { status: 500 });
  }
}

// GET /api/gdpr/request — List my GDPR requests
export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    const userId = req.headers.get("x-user-id");

    if (!companyId || !userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const requests = await prisma.gdprRequest.findMany({
      where: { companyId, userId },
      orderBy: { requestedAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        requestedAt: true,
        completedAt: true,
        rejectedAt: true,
        adminNote: true,
        downloadUrl: true,
      },
    });

    return NextResponse.json({ requests });
  } catch (err: any) {
    console.error("GDPR list error:", err);
    return NextResponse.json({ error: "Failed to fetch GDPR requests" }, { status: 500 });
  }
}
