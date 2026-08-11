import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rateLimit";
import { requireActiveSession, isCredentialChangeAllowed } from "@/lib/sessionGuard";
import { validatePassword } from "@/lib/passwordPolicy";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    // Session must still exist server-side — a cookie whose session was revoked
    // (password reset elsewhere, admin sign-out) must not be able to set a new
    // password and re-take the account.
    const session = await requireActiveSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isCredentialChangeAllowed(session)) {
      return NextResponse.json(
        { error: "Password cannot be changed from an impersonated or demo session" },
        { status: 403 },
      );
    }

    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    // Throttled per account, not per IP — this is an online guess against the
    // current password, so the account is the thing worth protecting.
    const rl = await rateLimitAsync(`change-password:${session.userId}`, 5, 15 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait before trying again." },
        { status: 429 },
      );
    }

    const { currentPassword, newPassword } = await req.json().catch(() => ({}) as any);

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "All password fields are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, password: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const passwordMatch = await bcrypt.compare(String(currentPassword), user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const policy = validatePassword(String(newPassword), [user.email, user.name]);
    if (!policy.ok) {
      return NextResponse.json({ error: policy.error }, { status: 400 });
    }

    if (await bcrypt.compare(String(newPassword), user.password)) {
      return NextResponse.json(
        { error: "New password must be different from your current password" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash },
      }),
      // Sign out every other device. This session's own row is dropped too, so
      // the client re-authenticates with the new password.
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.activityLog.deleteMany({
        where: { userId: user.id, action: "PASSWORD_RESET_REQUESTED" },
      }),
    ]);

    sendEmail({
      to: user.email,
      subject: "Your FinovaOS password was changed",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1035;color:#fff;border-radius:16px">
          <h2 style="margin:0 0 12px;font-size:22px">Password changed</h2>
          <p style="color:#94a3b8;margin:0 0 16px">The password for your FinovaOS account was changed from a signed-in session at IP <strong style="color:#fff">${ip}</strong> on ${new Date().toUTCString()}. All devices were signed out.</p>
          <p style="color:#f87171;margin:0">If this wasn't you, use "Forgot password" to regain control and contact support.</p>
        </div>
      `,
    }).catch((err) => console.error("Password change notice failed:", err));

    const res = NextResponse.json({
      success: true,
      message: "Password changed successfully. Please sign in again.",
      reauth: true,
    });
    res.cookies.set("sb_auth", "", { maxAge: 0, path: "/" });
    return res;
  } catch (error: unknown) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
