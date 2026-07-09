import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/gdpr/delete — Right to Erasure (Art. 17 GDPR)
// Schedules deletion; actual hard delete is done by admin after compliance review
export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    const userId = req.headers.get("x-user-id");

    if (!companyId || !userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { confirmDeletion } = body;

    if (!confirmDeletion) {
      return NextResponse.json({
        error: "You must confirm deletion by sending { confirmDeletion: true }",
        warning: "This action will schedule deletion of ALL your company data. This cannot be undone once the 7 business day processing window elapses.",
      }, { status: 400 });
    }

    // Check for existing deletion request
    const existing = await prisma.gdprRequest.findFirst({
      where: { companyId, userId, type: "DELETE", status: { in: ["PENDING", "PROCESSING"] } },
    });

    if (existing) {
      return NextResponse.json({
        error: "A deletion request is already pending.",
        requestId: existing.id,
        status: existing.status,
        submittedAt: existing.requestedAt,
      }, { status: 409 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    // Schedule deletion — Privacy Policy commits to 7 business days for immediate
    // deletion requests. We use 10 calendar days to allow for weekends within a
    // 7-business-day window.
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 10);

    const [gdprRequest] = await prisma.$transaction([
      prisma.gdprRequest.create({
        data: {
          companyId,
          userId,
          type: "DELETE",
          status: "PENDING",
          ipAddress,
          userAgent,
          adminNote: `Deletion scheduled. Data retention until: ${deletionDate.toISOString()}`,
        },
      }),
      prisma.company.update({
        where: { id: companyId },
        data: {
          dataRetentionUntil: deletionDate,
          subscriptionStatus: "DELETION_PENDING",
        },
      }),
    ]);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Confirm email to user
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: "GDPR Deletion Request Received — FinovaOS",
        html: `
          <p>Dear ${user.name},</p>
          <p>We have received your request to delete all personal data associated with your FinovaOS account under <strong>GDPR Article 17 (Right to Erasure)</strong>.</p>
          <p><strong>What happens next:</strong></p>
          <ul>
            <li>Our compliance team will process your request within <strong>7 business days</strong></li>
            <li>Data will be permanently deleted by: <strong>${deletionDate.toISOString().slice(0, 10)}</strong></li>
            <li>Certain data may be retained for legal compliance (e.g., tax records, as permitted by GDPR Art. 17(3)(b))</li>
            <li>You will receive a confirmation email when deletion is complete</li>
          </ul>
          <p><strong>Reference number:</strong> ${gdprRequest.id}</p>
          <p>If you wish to cancel this request, please contact <a href="mailto:privacy@finovaforge.com">privacy@finovaforge.com</a> immediately.</p>
          <hr>
          <p style="font-size:12px;color:#666;">Finova Forge, Faisalabad, Pakistan | GDPR Data Controller</p>
        `,
      }).catch(() => {});
    }

    // Alert admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `[GDPR URGENT] Deletion Request — ${user?.email || userId}`,
        html: `
          <p>A user has submitted a <strong>GDPR Right to Erasure</strong> request.</p>
          <ul>
            <li>User: ${user?.email || userId}</li>
            <li>Company ID: ${companyId}</li>
            <li>Request ID: ${gdprRequest.id}</li>
            <li>Deletion Date: ${deletionDate.toISOString().slice(0, 10)}</li>
          </ul>
          <p>Please review in the admin panel. Under GDPR Art. 17(3), you may retain tax/legal records but must delete all other personal data by the deletion date.</p>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      requestId: gdprRequest.id,
      message: "Your deletion request has been received. Data will be deleted within 7 business days.",
      scheduledDeletionDate: deletionDate.toISOString().slice(0, 10),
      note: "You may cancel this request within 3 days by contacting privacy@finovaforge.com",
    }, { status: 201 });
  } catch (err: any) {
    console.error("GDPR delete error:", err);
    return NextResponse.json({ error: "Failed to submit deletion request" }, { status: 500 });
  }
}
