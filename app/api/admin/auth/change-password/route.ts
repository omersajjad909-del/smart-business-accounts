/**
 * POST /api/admin/auth/change-password
 *
 * An admin changing their own password. Authenticated from the signed admin
 * cookie — the old version trusted the `x-user-id` header and then looked that
 * id up in *both* the User and AdminUser tables, so whoever controlled the
 * header chose whose password to rewrite.
 *
 * Changing the password revokes every other live session for the account.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAuditFromReq } from "@/lib/auditLogger";
import {
  logAdminAction,
  mintAdminToken,
  requireAdmin,
  setAdminCookie,
} from "@/lib/adminAuth";
import { validatePassword } from "@/lib/passwordPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, { anyPage: true });
    if (admin instanceof NextResponse) return admin;

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const policy = validatePassword(String(newPassword), [admin.email, admin.name]);
    if (!policy.ok) {
      return NextResponse.json({ error: policy.error }, { status: 400 });
    }

    const isTeam = admin.source === "team";
    const stored = isTeam
      ? (await (prisma as any).adminUser.findUnique({
          where: { id: admin.id },
          select: { passwordHash: true },
        }))?.passwordHash
      : (await prisma.user.findUnique({
          where: { id: admin.id },
          select: { password: true },
        }))?.password;

    if (!stored) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const match = await bcrypt.compare(currentPassword, stored);
    if (!match) {
      return NextResponse.json({ error: "Invalid current password" }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Bumping the token version in the same write invalidates every session
    // minted before this moment — including any an attacker was holding.
    let newTokenVersion = 0;
    if (isTeam) {
      const updated = await (prisma as any).adminUser.update({
        where: { id: admin.id },
        data: {
          passwordHash: hashedPassword,
          passwordChangedAt: new Date(),
          tokenVersion: { increment: 1 },
          failedAttempts: 0,
          lockedUntil: null,
        },
        select: { tokenVersion: true },
      });
      newTokenVersion = Number(updated.tokenVersion);
    } else {
      const updated = await prisma.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword, adminTokenVersion: { increment: 1 } } as any,
        select: { adminTokenVersion: true } as any,
      });
      newTokenVersion = Number((updated as any).adminTokenVersion);
    }

    await logAuditFromReq(req, {
      companyId: "admin",
      entity: isTeam ? "AdminUser" : "User",
      entityId: admin.id,
      action: "UPDATE",
      description: "Admin changed their own password",
    });
    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "ADMIN_PASSWORD_CHANGED",
      targetType: isTeam ? "AdminUser" : "User",
      targetId: admin.id,
      targetLabel: admin.email,
    });

    // Re-issue *this* browser's cookie at the new version so the admin who
    // just changed their password is not signed out of the tab they did it in.
    const res = NextResponse.json({ success: true, message: "Password updated successfully" });
    setAdminCookie(
      res,
      mintAdminToken({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        isSuperAdmin: admin.isSuperAdmin,
        source: admin.source,
        tokenVersion: newTokenVersion,
      }),
    );
    return res;
  } catch (error: any) {
    console.error("CHANGE_PASSWORD_ERROR:", error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
