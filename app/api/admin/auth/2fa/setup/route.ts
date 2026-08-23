/**
 * POST /api/admin/auth/2fa/setup
 *
 * Step 1.5 of admin login: hand back an authenticator secret for an account
 * that has not enrolled one yet. Reachable only with the short-lived,
 * password-verified `sb_admin_pending` cookie, and only while the account is
 * still un-enrolled — once `totpEnabled` is true this endpoint refuses, so a
 * stolen password cannot be used to swap out a working authenticator.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSecret, keyuri } from "@/lib/totp";
import { loadAdminAccount, readAdminPendingToken, type AdminSource } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const pending = readAdminPendingToken(req);
  if (!pending) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  const source: AdminSource = pending.src === "platform" ? "platform" : "team";
  const account = await loadAdminAccount(String(pending.id), source);
  if (!account || !account.active) {
    return NextResponse.json({ error: "Account unavailable" }, { status: 403 });
  }
  if (Number(pending.tv ?? 0) !== account.tokenVersion) {
    return NextResponse.json({ error: "Session revoked. Please sign in again." }, { status: 401 });
  }
  if (account.totpEnabled) {
    return NextResponse.json(
      { error: "An authenticator is already enrolled for this account." },
      { status: 400 },
    );
  }

  // Reuse the pending secret if enrolment was already started.
  //
  // Minting a fresh one on every visit looked tidier, but it meant a page
  // refresh — or one mistyped code followed by "Start over" — silently
  // invalidated the QR already sitting in the admin's authenticator. Every
  // subsequent code then failed with "Invalid or expired code" and no amount
  // of retrying could recover, because the phone and the database were holding
  // different secrets.
  //
  // Nothing is weakened by keeping it: the secret is only reachable with a
  // password-verified pending cookie, and whoever holds that could simply ask
  // for a new secret anyway.
  const secret = account.totpSecret || generateSecret();
  const otpAuthUrl = keyuri(account.email, "FinovaOS Admin", secret);

  if (secret !== account.totpSecret) {
    if (source === "team") {
      await (prisma as any).adminUser.update({
        where: { id: account.id },
        data: { totpSecret: secret, totpEnabled: false },
      });
    } else {
      await prisma.user.update({
        where: { id: account.id },
        data: { twoFactorSecret: secret, twoFactorEnabled: false },
      });
    }
  }

  return NextResponse.json({ secret, otpAuthUrl });
}
