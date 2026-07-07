import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/gdpr/export — Generate and return user's data export
export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    const userId = req.headers.get("x-user-id");

    if (!companyId || !userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check for a completed or pending EXPORT request
    const gdprRequest = await prisma.gdprRequest.findFirst({
      where: { companyId, userId, type: "EXPORT", status: { in: ["PENDING", "PROCESSING", "COMPLETED"] } },
      orderBy: { requestedAt: "desc" },
    });

    if (gdprRequest?.status === "COMPLETED" && gdprRequest.downloadUrl) {
      return NextResponse.json({
        message: "Your export is ready.",
        downloadUrl: gdprRequest.downloadUrl,
        generatedAt: gdprRequest.completedAt,
      });
    }

    // Collect all user data across the platform
    const [user, company, loginLogs, auditLogs, activityLogs, sessions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, email: true, role: true, active: true,
          createdAt: true, referralCode: true, preferredLanguage: true,
          twoFactorEnabled: true, avatar: false,
        },
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true, name: true, code: true, country: true, baseCurrency: true,
          plan: true, businessType: true, subscriptionStatus: true,
          createdAt: true, preferredLanguage: true, ccpaOptOut: true,
        },
      }),
      prisma.loginLog.findMany({
        where: { userId, companyId },
        select: { loginAt: true, logoutAt: true, ipAddress: true, city: true, country: true },
        orderBy: { loginAt: "desc" },
        take: 100,
      }),
      prisma.auditLog.findMany({
        where: { userId, companyId },
        select: { action: true, entity: true, entityId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.activityLog.findMany({
        where: { userId, companyId },
        select: { action: true, details: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.session.findMany({
        where: { userId, companyId },
        select: { createdAt: true, expiresAt: true, ip: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
      gdprArticle: "Art. 15 & 20 GDPR — Right of Access and Data Portability",
      profile: user,
      company,
      loginHistory: loginLogs,
      auditTrail: auditLogs,
      activityLog: activityLogs,
      sessions: sessions.map(s => ({ createdAt: s.createdAt, expiresAt: s.expiresAt, ip: s.ip })),
    };

    // Mark any pending EXPORT request as completed
    if (gdprRequest) {
      await prisma.gdprRequest.update({
        where: { id: gdprRequest.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    // Send notification email
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: "Your FinovaOS Data Export is Ready",
        html: `
          <p>Dear ${user.name},</p>
          <p>Your GDPR data export is attached to this email as a JSON file.</p>
          <p>This export contains all personal data we hold about you as required by GDPR Article 15 (Right of Access) and Article 20 (Data Portability).</p>
          <p>If you have any questions about the data we hold, please contact <a href="mailto:privacy@finovaforge.com">privacy@finovaforge.com</a></p>
          <p>Export date: ${new Date().toISOString().slice(0, 10)}</p>
        `,
        attachments: [{
          filename: `finovaos-data-export-${userId}-${new Date().toISOString().slice(0, 10)}.json`,
          content: Buffer.from(JSON.stringify(exportData, null, 2)),
        }],
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "Data export completed. Check your email for the file.",
      data: exportData,
    });
  } catch (err: any) {
    console.error("GDPR export error:", err);
    return NextResponse.json({ error: "Failed to generate data export" }, { status: 500 });
  }
}
