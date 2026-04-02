import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { signJwt } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
    const emailNormalized = String(email).trim().toLowerCase();
    const expMs = Date.now() + 15 * 60 * 1000;
    const token = signJwt({ email: emailNormalized, exp: expMs });
    const base = process.env.NEXT_PUBLIC_APP_URL || "";
    const url = `${base}/api/auth/magic/callback?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: emailNormalized,
      subject: "Login to Finova",
      html: `<p>Click to login: <a href="${url}">${url}</a></p><p>This link expires in 15 minutes.</p>`,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
