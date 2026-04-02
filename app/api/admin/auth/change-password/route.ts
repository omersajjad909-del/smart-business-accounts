import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAuditFromReq } from "@/lib/auditLogger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return NextResponse.json({ error: "Invalid current password" }, { status: 401 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Log the change
    await logAuditFromReq(req, {
      companyId: "admin",
      entity: "User",
      entityId: userId,
      action: "UPDATE",
      description: `Admin changed their own password`,
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("CHANGE_PASSWORD_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to update password" }, { status: 500 });
  }
}
