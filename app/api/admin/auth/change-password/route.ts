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
      select: { id: true, password: true, email: true, role: true },
    });

    const adminUser = user
      ? null
      : await (prisma as any).adminUser?.findUnique({
          where: { id: userId },
          select: { id: true, passwordHash: true, email: true, name: true },
        });

    const account = user ?? adminUser;
    if (!account) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const storedPassword = user ? user.password : adminUser.passwordHash;
    const match = await bcrypt.compare(currentPassword, storedPassword);
    if (!match) {
      return NextResponse.json({ error: "Invalid current password" }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    if (user) {
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    } else {
      await (prisma as any).adminUser.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      });
    }

    await logAuditFromReq(req, {
      companyId: "admin",
      entity: user ? "User" : "AdminUser",
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
