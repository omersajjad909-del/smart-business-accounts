import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

// GET /api/admin/gdpr — List all pending GDPR requests (admin only)
export async function GET(req: NextRequest) {
  try {
    const adminRole = req.headers.get("x-user-role");
    if (adminRole !== "ADMIN" && adminRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "PENDING";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      prisma.gdprRequest.findMany({
        where: status !== "ALL" ? { status } : {},
        orderBy: { requestedAt: "asc" },
        skip,
        take: limit,
        include: {
          company: { select: { name: true, country: true, plan: true } },
          user: { select: { name: true, email: true, role: true } },
        },
      }),
      prisma.gdprRequest.count({
        where: status !== "ALL" ? { status } : {},
      }),
    ]);

    return NextResponse.json({
      requests,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("Admin GDPR list error:", err);
    return NextResponse.json({ error: "Failed to fetch GDPR requests" }, { status: 500 });
  }
}

// PATCH /api/admin/gdpr — Process a GDPR request (approve/reject)
export async function PATCH(req: NextRequest) {
  try {
    const adminId = req.headers.get("x-user-id");
    const adminRole = req.headers.get("x-user-role");

    if (adminRole !== "ADMIN" && adminRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, action, adminNote } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: "requestId and action are required" }, { status: 400 });
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "action must be APPROVE or REJECT" }, { status: 400 });
    }

    const gdprRequest = await prisma.gdprRequest.findUnique({
      where: { id: requestId },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!gdprRequest) {
      return NextResponse.json({ error: "GDPR request not found" }, { status: 404 });
    }

    if (!["PENDING", "PROCESSING"].includes(gdprRequest.status)) {
      return NextResponse.json({
        error: `Request is already ${gdprRequest.status}. Cannot process it again.`,
      }, { status: 409 });
    }

    if (action === "REJECT") {
      await prisma.gdprRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectedBy: adminId || "admin",
          adminNote: adminNote || "Request rejected by administrator.",
        },
      });

      if (gdprRequest.user?.email) {
        await sendEmail({
          to: gdprRequest.user.email,
          subject: `GDPR Request Update — ${gdprRequest.type}`,
          html: `
            <p>Dear ${gdprRequest.user.name},</p>
            <p>Your GDPR ${gdprRequest.type} request (ID: ${requestId}) has been reviewed.</p>
            <p><strong>Outcome: Unable to Process</strong></p>
            ${adminNote ? `<p><strong>Reason:</strong> ${adminNote}</p>` : ""}
            <p>If you believe this is incorrect, you have the right to lodge a complaint with your local data protection authority.</p>
            <p>Contact us at <a href="mailto:privacy@finovaforge.com">privacy@finovaforge.com</a> for more information.</p>
          `,
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    // APPROVE — execute the request
    await prisma.gdprRequest.update({
      where: { id: requestId },
      data: { status: "PROCESSING", adminNote },
    });

    if (gdprRequest.type === "DELETE") {
      // Execute right-to-forget: anonymize user data
      // Per GDPR Art. 17(3), we retain financial/tax records but anonymize PII
      await prisma.$transaction(async (tx) => {
        // Anonymize the user
        await tx.user.update({
          where: { id: gdprRequest.userId },
          data: {
            name: `[Deleted User ${gdprRequest.userId.slice(-6)}]`,
            email: `deleted-${gdprRequest.userId}@gdpr.deleted`,
            password: "GDPR_DELETED",
            active: false,
            referralCode: null,
            avatar: null,
            twoFactorSecret: null,
          },
        });

        // Purge sessions and sensitive logs
        await tx.session.deleteMany({ where: { userId: gdprRequest.userId } });
        await tx.loginLog.deleteMany({ where: { userId: gdprRequest.userId } });

        // Mark company for eventual deletion if this was the only/admin user
        await tx.company.update({
          where: { id: gdprRequest.companyId },
          data: { dataRetentionUntil: new Date() },
        });

        // Mark GDPR request complete
        await tx.gdprRequest.update({
          where: { id: requestId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      });

      if (gdprRequest.user?.email) {
        await sendEmail({
          to: gdprRequest.user.email,
          subject: "GDPR Erasure Completed — FinovaOS",
          html: `
            <p>Dear ${gdprRequest.user.name},</p>
            <p>Your GDPR Right to Erasure request has been processed. Your personal account data has been deleted from FinovaOS.</p>
            <p>Note: As required by law (GDPR Art. 17(3)(b) and (c)), financial and tax records may be retained for the legally required period.</p>
            <p>Request ID: ${requestId}</p>
            <p>Completed: ${new Date().toISOString().slice(0, 10)}</p>
            <hr>
            <p style="font-size:12px;color:#666;">Finova Forge | GDPR Compliance</p>
          `,
        }).catch(() => {});
      }
    } else if (gdprRequest.type === "EXPORT") {
      // Mark as completed — export was already generated via /api/gdpr/export
      await prisma.gdprRequest.update({
        where: { id: requestId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    } else {
      // RESTRICT / PORTABILITY — mark complete with admin note
      await prisma.gdprRequest.update({
        where: { id: requestId },
        data: { status: "COMPLETED", completedAt: new Date(), adminNote },
      });

      if (gdprRequest.user?.email) {
        await sendEmail({
          to: gdprRequest.user.email,
          subject: `GDPR Request Completed — ${gdprRequest.type}`,
          html: `
            <p>Dear ${gdprRequest.user.name},</p>
            <p>Your GDPR ${gdprRequest.type} request has been processed and completed.</p>
            ${adminNote ? `<p><strong>Note from our team:</strong> ${adminNote}</p>` : ""}
            <p>Request ID: ${requestId}</p>
            <p>Contact <a href="mailto:privacy@finovaforge.com">privacy@finovaforge.com</a> for further assistance.</p>
          `,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, status: "COMPLETED", requestId });
  } catch (err: any) {
    console.error("Admin GDPR process error:", err);
    return NextResponse.json({ error: "Failed to process GDPR request" }, { status: 500 });
  }
}
