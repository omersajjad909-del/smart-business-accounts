import { NextRequest, NextResponse } from "next/server";

import { signJwt, verifyJwt } from "@/lib/auth";
import type { BusinessType } from "@/lib/businessModules";
import { currencyByCountry } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import {
  getLatestVerificationLog,
  getOtpHash,
  isUserVerified,
  safeJson,
} from "@/lib/verification";

/** Guessing six digits is cheap; make each pending signup pay for its tries. */
const MAX_OTP_ATTEMPTS = 5;

/**
 * Turn a verified PendingSignup into the real thing.
 *
 * This is the only place a signup becomes a Company — nothing upstream writes to
 * the real tables, so an unverified address can never own a tenant. One
 * transaction, so a failure halfway cannot leave a company with no owner.
 */
async function promotePendingSignup(pendingId: string) {
  const pending = await prisma.pendingSignup.findUnique({ where: { id: pendingId } });
  if (!pending) return null;

  const data = safeJson(pending.payload);
  if (!data) return null;

  const country = data.countryCode ? String(data.countryCode).toUpperCase() : "US";
  const customModuleIds: string[] = Array.isArray(data.customModuleIds)
    ? data.customModuleIds
    : [];

  const { company, user } = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: String(data.companyName),
        isActive: true,
        country,
        // currencyByCountry returns null for countries it has no mapping for —
        // fall back to USD rather than writing null into a non-nullable column.
        baseCurrency: currencyByCountry(country) || "USD",
        businessType: (data.businessType ? String(data.businessType) : "trading") as BusinessType,
        businessSetupDone: Boolean(data.businessType),
        plan: String(data.planCode || "STARTER"),
        subscriptionStatus: "INACTIVE",
        activeModules: customModuleIds.length > 0 ? customModuleIds.join(",") : null,
        customPrice: data.customPrice ?? null,
      },
    });

    const user = await tx.user.create({
      data: {
        name: String(data.name),
        email: pending.email,
        password: String(data.passwordHash),
        role: "ADMIN",
        defaultCompanyId: company.id,
      },
    });

    await tx.userCompany.create({
      data: { userId: user.id, companyId: company.id, isDefault: true },
    });

    // The pending row is consumed inside the same transaction: if anything above
    // fails, the visitor still has a valid code to retry with.
    await tx.pendingSignup.delete({ where: { id: pending.id } });

    return { company, user };
  });

  // Funnel breadcrumbs. Non-critical — a failure here must not undo a signup
  // that already succeeded, so they sit outside the transaction.
  if (data.countryCode) {
    await prisma.activityLog
      .create({
        data: {
          companyId: company.id,
          userId: null,
          action: "COMPANY_COUNTRY_SET",
          details: JSON.stringify({ country }),
        },
      })
      .catch(() => {});
  }

  await prisma.activityLog
    .create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: "SIGNUP",
        details: JSON.stringify({
          email: user.email,
          phone: data.phone || null,
          plan: String(data.planCode || "STARTER"),
          teamSize: data.teamSize || null,
          referralSource: data.referralSource || null,
        }),
      },
    })
    .catch(() => {});

  if (data.phone) {
    await prisma.activityLog
      .create({
        data: {
          companyId: company.id,
          userId: user.id,
          action: "USER_PHONE_SET",
          details: JSON.stringify({ phone: data.phone, source: "signup" }),
        },
      })
      .catch(() => {});
  }

  if (data.referralCode) {
    try {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: String(data.referralCode).toUpperCase().trim() },
        select: { id: true },
      });
      if (referrer && referrer.id !== user.id) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            refereeEmail: user.email,
            status: "signed_up",
          },
        });
      }
    } catch { /* non-critical */ }
  }

  return { companyId: company.id, userId: user.id };
}

export async function POST(req: NextRequest) {
  try {
    const verifyToken = req.cookies.get("sb_verify")?.value || "";
    const verify = verifyToken ? verifyJwt(verifyToken) : null;
    let userId = String(verify?.userId || "");
    let companyId = String(verify?.companyId || "");
    const pendingId = String(verify?.pendingId || "");
    const nextPath = String(verify?.next || "/dashboard");
    const roleFromVerify = verify?.role ? String(verify.role).toUpperCase() : null;
    const channel = String(verify?.channel || "email");
    const exp = Number(verify?.exp || 0);

    // Either shape is valid: a pending signup with nothing in the real tables
    // yet, or the legacy shape for accounts the old flow already created.
    if ((!pendingId && (!userId || !companyId)) || !exp || Date.now() > exp) {
      const res = NextResponse.json(
        { error: "Verification session expired" },
        { status: 401 },
      );
      res.cookies.set("sb_verify", "", { path: "/", maxAge: 0 });
      return res;
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    if (pendingId) {
      // ── Pending signup: verify first, create second ──────────────────────
      const pending = await prisma.pendingSignup.findUnique({
        where: { id: pendingId },
      });
      if (!pending) {
        const res = NextResponse.json(
          { error: "Verification session expired. Please sign up again." },
          { status: 401 },
        );
        res.cookies.set("sb_verify", "", { path: "/", maxAge: 0 });
        return res;
      }

      if (pending.attempts >= MAX_OTP_ATTEMPTS) {
        await prisma.pendingSignup.delete({ where: { id: pending.id } }).catch(() => {});
        const res = NextResponse.json(
          { error: "Too many incorrect codes. Please sign up again." },
          { status: 429 },
        );
        res.cookies.set("sb_verify", "", { path: "/", maxAge: 0 });
        return res;
      }

      if (Date.now() > pending.otpExpiresAt.getTime()) {
        return NextResponse.json({ error: "Code expired" }, { status: 400 });
      }

      if (getOtpHash(code) !== pending.otpHash) {
        await prisma.pendingSignup
          .update({
            where: { id: pending.id },
            data: { attempts: { increment: 1 } },
          })
          .catch(() => {});
        return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
      }

      const promoted = await promotePendingSignup(pending.id);
      if (!promoted) {
        return NextResponse.json(
          { error: "Could not complete signup. Please try again." },
          { status: 500 },
        );
      }

      userId = promoted.userId;
      companyId = promoted.companyId;

      await prisma.activityLog
        .create({
          data: {
            companyId,
            userId,
            action: "ACCOUNT_VERIFIED",
            details: JSON.stringify({ at: Date.now(), channel }),
          },
        })
        .catch(() => {});
    } else if (!(await isUserVerified(userId))) {
      // ── Legacy: account already exists, just confirm it ──────────────────
      const last = await getLatestVerificationLog(companyId, userId);
      const details = safeJson(last?.details || null);
      const hash = details?.h ? String(details.h) : "";
      const otpExp = details?.exp ? Number(details.exp) : 0;

      if (!hash || !otpExp || Date.now() > otpExp) {
        return NextResponse.json({ error: "Code expired" }, { status: 400 });
      }
      if (getOtpHash(code) !== hash) {
        return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
      }

      await prisma.activityLog.create({
        data: {
          companyId,
          userId,
          action: "ACCOUNT_VERIFIED",
          details: JSON.stringify({ at: Date.now(), channel }),
        },
      });

      // Activate the company now that email is confirmed
      await prisma.company.update({
        where: { id: companyId },
        data: { isActive: true },
      }).catch(() => {});
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        defaultCompanyId: true,
        active: true,
      },
    });
    if (!user || !user.active) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const companies = await prisma.userCompany.findMany({
      where: { userId },
      include: { company: true },
    });
    const resolvedCompanyId =
      user.defaultCompanyId ||
      companies.find((membership) => membership.isDefault)?.companyId ||
      companies[0]?.companyId ||
      companyId;

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (roleFromVerify || user.role || "VIEWER").toUpperCase(),
      companyId: resolvedCompanyId,
      companies: companies.map((membership) => ({
        id: membership.companyId,
        name: membership.company?.name,
        code: membership.company?.code,
        isDefault: membership.isDefault,
      })),
    };

    const token = signJwt({
      userId: safeUser.id,
      role: safeUser.role,
      companyId: resolvedCompanyId,
    });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      await prisma.session.create({
        data: {
          userId: safeUser.id,
          token,
          expiresAt,
          companyId: resolvedCompanyId || "",
          ip: req.headers.get("x-forwarded-for"),
          userAgent: req.headers.get("user-agent") || null,
        },
      });
    } catch {}

    const res = NextResponse.json({ ok: true, user: safeUser, next: nextPath });
    res.cookies.set("sb_auth", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    res.cookies.set("sb_verify", "", { path: "/", maxAge: 0 });
    return res;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
