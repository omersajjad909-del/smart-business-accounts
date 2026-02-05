import { NextRequest, NextResponse } from "next/server";
import { testEmailConfig } from "@/lib/email";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

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

    const result = await testEmailConfig();

    await prisma.activityLog.create({
      data: {
        action: result.success ? "EMAIL_TEST_SUCCESS" : "EMAIL_TEST_FAILED",
        details: result.message || "Email configuration test",
        userId: userId || null,
        companyId,
      },
    });

    return NextResponse.json(result);
  } catch (error: Any) {
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

