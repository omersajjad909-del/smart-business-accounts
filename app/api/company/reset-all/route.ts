/**
 * POST /api/company/reset-all — wipe every record this company has recorded,
 * keeping the company, its users and their logins.
 *
 * This is the same primitive the demo sandbox uses to reset itself
 * (`clearCompanyData`), pointed at a real tenant instead. Because it is
 * irreversible and destroys real bookkeeping, it takes two round trips:
 *
 *   1. ADMIN posts their current password and the exact company name. Nothing
 *      is deleted — a six-digit code is mailed to the account's own address.
 *   2. The same admin posts that code alongside the same two proofs, and only
 *      then is anything erased.
 *
 * The mail has to arrive *before* the wipe or it protects nothing: a notice
 * that lands after the books are already gone tells its reader about a loss
 * they can no longer prevent. Splitting it this way means whoever is at the
 * keyboard must also hold the inbox, so a session left open on an unlocked
 * screen — or a password someone has watched being typed — is not enough on
 * its own.
 *
 * GET returns just the company name, so the confirm screen can tell the
 * caller what to type without trusting anything the client already has
 * cached.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rateLimit";
import { requireActiveSession, isCredentialChangeAllowed } from "@/lib/sessionGuard";
import { clearCompanyData } from "@/lib/clearCompanyData";
import { sendEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/adminAuth";
import { newOtpCode, getOtpHash, maskEmail, safeJson } from "@/lib/verification";

/**
 * Its own action name, not the shared VERIFY_OTP the login and signup flows
 * write. A code minted to confirm an email address must never be spendable
 * on a wipe, and this is what keeps the two from reaching each other.
 */
const RESET_OTP_ACTION = "SYSTEM_RESET_OTP";

export async function GET(req: NextRequest) {
  const session = await requireActiveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.companyId) {
    return NextResponse.json({ error: "No company on this session" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { name: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({
    companyName: company.name,
    isAdmin: session.role === "ADMIN",
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireActiveSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isCredentialChangeAllowed(session)) {
      return NextResponse.json(
        { error: "This cannot be done from an impersonated or demo session" },
        { status: 403 },
      );
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Only an admin can reset the system" }, { status: 403 });
    }
    if (!session.companyId) {
      return NextResponse.json({ error: "No company on this session" }, { status: 400 });
    }

    const { password, confirmName, code } = await req.json().catch(() => ({}) as any);
    if (!password || !confirmName) {
      return NextResponse.json({ error: "Password and company name confirmation are required" }, { status: 400 });
    }

    // Two budgets, because the steps are guessed at differently: the first is
    // an online guess against the password, the second against a six-digit
    // code, and one must not exhaust the other.
    const rl = await rateLimitAsync(
      code ? `reset-all-confirm:${session.userId}` : `reset-all-request:${session.userId}`,
      code ? 5 : 3,
      15 * 60_000,
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait before trying again." },
        { status: 429 },
      );
    }

    const [user, company] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, password: true, email: true, name: true },
      }),
      prisma.company.findUnique({
        where: { id: session.companyId },
        select: { id: true, name: true },
      }),
    ]);
    if (!user || !company) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Demanded again on the second step, so the code alone can never wipe a
    // company — whoever spends it still has to hold the password.
    const passwordMatch = await bcrypt.compare(String(password), user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }
    if (String(confirmName).trim() !== company.name) {
      return NextResponse.json({ error: "Company name does not match" }, { status: 400 });
    }

    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const when = new Date();

    // ── Step 1: no code yet — mint one, mail it, delete nothing ─────────────
    if (!code) {
      const otp = newOtpCode();

      await prisma.activityLog.create({
        data: {
          companyId: company.id,
          userId: user.id,
          action: RESET_OTP_ACTION,
          details: JSON.stringify({ h: getOtpHash(otp.code), exp: otp.expMs, ip }),
        },
      });

      // Says what the code does, not merely that it is a code. A six-digit
      // number described as "verification" is one a caller can talk someone
      // out of; one that says it erases the books is not.
      const sent = await sendEmail({
        to: user.email,
        subject: `Confirmation code to erase all data for ${company.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1035;color:#fff;border-radius:16px">
            <h2 style="margin:0 0 12px;font-size:22px">Confirm the system reset</h2>
            <p style="color:#94a3b8;margin:0 0 20px">
              Someone signed in as <strong style="color:#fff">${user.email}</strong> asked to permanently
              delete every invoice, voucher, ledger entry, contact and record belonging to
              <strong style="color:#fff">${company.name}</strong>, from IP
              <strong style="color:#fff">${ip}</strong> on ${when.toUTCString()}.
            </p>
            <div style="text-align:center;margin:0 0 20px">
              <div style="display:inline-block;background:rgba(239,68,68,.12);border:2px dashed rgba(239,68,68,.5);border-radius:14px;padding:18px 36px">
                <div style="font-size:11px;letter-spacing:2px;color:#fca5a5;text-transform:uppercase;margin-bottom:8px">Code to erase everything</div>
                <div style="font-size:34px;font-weight:900;letter-spacing:10px;font-family:monospace;color:#fff">${otp.code}</div>
              </div>
            </div>
            <p style="color:#94a3b8;margin:0 0 16px">It expires in 15 minutes. Nothing has been deleted yet — entering this code is what deletes it, and it cannot be undone.</p>
            <p style="color:#f87171;margin:0"><strong>If this wasn't you, do not share this code.</strong> Change your password immediately and contact support — whoever asked already knows your password.</p>
          </div>
        `,
      });

      if (!sent.success) {
        return NextResponse.json(
          { error: "Could not send the confirmation code to your email. Nothing was deleted." },
          { status: 502 },
        );
      }

      return NextResponse.json({ otpRequired: true, sentTo: maskEmail(user.email) });
    }

    // ── Step 2: a code was supplied — check it, then wipe ───────────────────
    const issued = await prisma.activityLog.findFirst({
      where: { companyId: company.id, userId: user.id, action: RESET_OTP_ACTION },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    const details = safeJson(issued?.details || null);
    const hash = details?.h ? String(details.h) : "";
    const exp = details?.exp ? Number(details.exp) : 0;

    if (!hash || !exp || Date.now() > exp) {
      return NextResponse.json(
        { error: "That code has expired. Start again to get a new one." },
        { status: 400 },
      );
    }
    if (getOtpHash(String(code).trim()) !== hash) {
      return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
    }

    // The wipe takes the whole company's ActivityLog with it, including the
    // row just checked, so the code cannot be spent twice.
    await clearCompanyData(company.id);

    // Written after the wipe, not inside it — a row written before would be
    // erased along with everything else. A later reset will in turn wipe this
    // one, so it is not durable proof on its own; the two below are.
    await prisma.activityLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: "SYSTEM_RESET",
        details: `Full system reset performed by ${user.name} (${user.email}) from IP ${ip} at ${when.toISOString()}`,
      },
    }).catch(() => {});

    // Mirrored into the platform's own AdminActionLog — the one table
    // clearCompanyData never touches, so it survives even a second reset of
    // the same company and shows up in /admin/audit-trail whichever tenant it
    // happened in.
    //
    // Awaited, not fire-and-forget: a serverless function can be frozen the
    // moment its response is sent, which would silently drop an unawaited
    // promise before it ever reached the network.
    await logAdminAction({
      adminId: user.id,
      adminEmail: user.email,
      action: "SYSTEM_RESET",
      targetType: "Company",
      targetId: company.id,
      targetLabel: company.name,
      companyId: company.id,
      details: { ip, at: when.toISOString(), confirmedBy: "password+company-name+email-code" },
    }).catch(() => {});

    // The receipt, as opposed to the code above: it lands in the inbox
    // outside the database this reset just emptied, which is what a later
    // "I didn't do this" dispute has left to look at.
    await sendEmail({
      to: user.email,
      subject: "Your FinovaOS system data was reset",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1035;color:#fff;border-radius:16px">
          <h2 style="margin:0 0 12px;font-size:22px">System reset completed</h2>
          <p style="color:#94a3b8;margin:0 0 16px">
            All records for <strong style="color:#fff">${company.name}</strong> were deleted from a
            signed-in session at IP <strong style="color:#fff">${ip}</strong> on ${when.toUTCString()},
            confirmed with your account password, the company name, and the code emailed to this address.
          </p>
          <p style="color:#f87171;margin:0">If this wasn't you, contact support immediately — this action cannot be undone.</p>
        </div>
      `,
    }).catch((err) => console.error("Reset-all notice failed:", err));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("RESET ALL SYSTEM ERROR:", error);
    return NextResponse.json({ error: "Failed to reset system" }, { status: 500 });
  }
}
