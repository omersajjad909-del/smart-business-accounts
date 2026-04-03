import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { signJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createVerificationCodeLog,
  isUserVerified,
  sendVerificationCode,
} from "@/lib/verification";

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const base = process.env.NEXT_PUBLIC_APP_URL || "";
    if (!clientId || !clientSecret || !base) {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 500 },
      );
    }

    const code = req.nextUrl.searchParams.get("code") || "";
    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const redirectUri = `${base}/api/auth/google/callback`;
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Token exchange failed" },
        { status: 400 },
      );
    }

    const infoRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const info = await infoRes.json();
    const email = String(info?.email || "").toLowerCase();
    const name = String(info?.name || info?.given_name || "User");
    if (!email) {
      return NextResponse.json(
        { error: "Email not provided by Google" },
        { status: 400 },
      );
    }

    let user = await prisma.user.findUnique({ where: { email } });
    let companyId = user?.defaultCompanyId || "";

    if (!user) {
      const hash = await bcrypt.hash(cryptoRandom(), 10);
      const company = await prisma.company.create({
        data: {
          name: `${name.split(" ")[0]}'s Company`,
          code: null,
          isActive: true,
        },
      } as never);
      companyId = company.id;
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hash,
          role: "ACCOUNTANT",
          active: true,
          defaultCompanyId: companyId,
          companies: { create: { companyId, isDefault: true } },
        },
      } as never);
    } else if (!companyId) {
      const company = await prisma.company.create({
        data: {
          name: `${name.split(" ")[0]}'s Company`,
          code: null,
          isActive: true,
        },
      } as never);
      companyId = company.id;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          defaultCompanyId: companyId,
          companies: { create: { companyId, isDefault: true } },
        },
      } as never);
    }

    const verified = await isUserVerified(user.id);

    if (!verified) {
      const { code, expMs } = await createVerificationCodeLog({
        companyId,
        userId: user.id,
        channel: "email",
        target: email,
      });

      const emailResult = await sendVerificationCode({
        name,
        email,
        channel: "email",
        code,
      });

      if (!emailResult.success) {
        console.error("Google callback OTP email failed:", emailResult.error);
        return NextResponse.redirect(
          `${base}/auth?error=${encodeURIComponent("We could not send the verification email. Please try again.")}`,
        );
      }

      const verifyToken = signJwt({
        userId: user.id,
        companyId,
        role: user.role,
        email,
        channel: "email",
        next: "/dashboard",
        exp: expMs,
      });

      const res = NextResponse.redirect(
        `${base}/auth?mode=verify&email=${encodeURIComponent(email)}`,
      );
      res.cookies.set("sb_verify", verifyToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });
      return res;
    }

    const token = signJwt({ userId: user.id, companyId, role: user.role });
    await prisma.session.create({
      data: {
        userId: user.id,
        companyId,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        ip:
          (req.headers.get("x-forwarded-for") || "")
            .split(",")[0]
            ?.trim() || req.headers.get("x-real-ip") || "",
        userAgent: req.headers.get("user-agent") ?? "",
      },
    });

    const res = NextResponse.redirect(`${base}/dashboard`);
    res.cookies.set("sb_auth", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth failed" },
      { status: 500 },
    );
  }
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
