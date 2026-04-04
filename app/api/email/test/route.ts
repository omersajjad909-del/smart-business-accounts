import { NextRequest, NextResponse } from "next/server";
import { sendEmail, testEmailConfig } from "@/lib/email";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
import { prisma as appPrisma } from "@/lib/prisma";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.MANAGE_USERS,
      companyId
    );

    if (!allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const result = await testEmailConfig(companyId);

    await prisma.activityLog.create({
      data: {
        action: result.success ? "EMAIL_TEST_SUCCESS" : "EMAIL_TEST_FAILED",
        details: result.message || "Email configuration test",
        userId: userId || null,
        companyId,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ Email test error:", error);

    try {
      const userId = req.headers.get("x-user-id");
      const companyId = await resolveCompanyId(req);
      if (companyId) {
        await prisma.activityLog.create({
          data: {
            action: "EMAIL_TEST_FAILED",
            details: error.message || "Unhandled email test error",
            userId: userId || null,
            companyId,
          },
        });
      }
    } catch (logError) {
      console.error("❌ Failed to log email test error:", logError);
    }

    return NextResponse.json(
      { success: false, message: error.message || "Email test failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);

    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.MANAGE_USERS,
      companyId,
    );

    if (!allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedTo = String(body?.to || "").trim().toLowerCase();

    let to = requestedTo;
    if (!to && userId) {
      const user = await appPrisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      to = user?.email || "";
    }

    if (!to) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 },
      );
    }

    const company = await appPrisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.7">
        <h2 style="margin:0 0 12px">FinovaOS Email Test</h2>
        <p>This is a real SMTP test email from <strong>${company?.name || "your FinovaOS workspace"}</strong>.</p>
        <p>If you received this message, your email configuration is working correctly.</p>
        <div style="margin-top:18px;padding:14px 16px;border-radius:10px;background:#f3f4f6;color:#4b5563;font-size:13px">
          Sent at: ${new Date().toLocaleString()}
        </div>
      </div>
    `;

    const result = await sendEmail({
      to,
      subject: "FinovaOS SMTP test email",
      html,
      companyId,
    });

    await prisma.activityLog.create({
      data: {
        action: result.success ? "EMAIL_TEST_SENT" : "EMAIL_TEST_FAILED",
        details: result.success
          ? `Test email sent to ${to}`
          : result.error || "Email send failed",
        userId: userId || null,
        companyId,
      },
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send test email" },
      { status: 500 },
    );
  }
}

