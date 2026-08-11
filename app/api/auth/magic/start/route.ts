import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { signJwt } from "@/lib/auth";
import { createHash } from "crypto";
import { rateLimitAsync } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();

    const { email } = await req.json().catch(() => ({}) as any);
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
    const emailNormalized = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // This endpoint mails a link that logs the recipient straight in. Without a
    // per-address limit, anyone could flood a target's inbox with live login
    // links from rotating IPs. Address is hashed so the limiter never stores it.
    const emailKey = createHash("sha256").update(emailNormalized).digest("hex").slice(0, 32);
    const ipLimit = await rateLimitAsync(`magic:ip:${ip}`, 5, 60_000);
    const emailLimit = await rateLimitAsync(`magic:email:${emailKey}`, 3, 15 * 60_000);
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
    }
    // Same reply as success — this must not become an enumeration oracle.
    if (!emailLimit.allowed) return NextResponse.json({ ok: true });

    const expMs = Date.now() + 15 * 60 * 1000;
    const token = signJwt({ email: emailNormalized, exp: expMs });
    const base = process.env.NEXT_PUBLIC_APP_URL || "";
    const url = `${base}/api/auth/magic/callback?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: emailNormalized,
      subject: "Login to FinovaOS",
      html: `<p>Click to login: <a href="${url}">${url}</a></p><p>This link expires in 15 minutes.</p>`,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("MAGIC LINK ERROR:", e);
    return NextResponse.json({ error: "Could not send login link" }, { status: 500 });
  }
}
