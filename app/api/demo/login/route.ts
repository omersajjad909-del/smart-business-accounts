import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_MAX_CONCURRENT,
  DEMO_SESSION_MINUTES,
  countActiveSandboxes,
  createDemoSandbox,
  isDemoBusinessType,
  isDemoCredential,
  isDemoPassword,
} from "@/lib/demoSandbox";
import { DEMO_BUSINESS_TYPES } from "@/lib/demoSeed";
import { rateLimitAsync } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Starts a demo session.
 *
 * Every call mints a brand-new sandbox company seeded with the golden dataset
 * for the chosen business, so concurrent visitors never share data. Credentials
 * are optional here — the demo page starts sessions directly — but when they
 * are supplied they must be the published demo pair.
 */
async function start(req: NextRequest, businessType: string | null, creds: { email?: string; password?: string }) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = await rateLimitAsync(`demo-start:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { message: "Too many demo sessions from this connection. Please wait a minute." },
      { status: 429 },
    );
  }

  if (creds.email !== undefined || creds.password !== undefined) {
    if (!isDemoCredential(creds.email || "") || !isDemoPassword(creds.password || "")) {
      return NextResponse.json({ message: "Invalid demo credentials" }, { status: 401 });
    }
  }

  if (!isDemoBusinessType(businessType)) {
    return NextResponse.json(
      { message: "Pick a business to demo", allowed: DEMO_BUSINESS_TYPES },
      { status: 400 },
    );
  }

  const live = await countActiveSandboxes();
  if (live >= DEMO_MAX_CONCURRENT) {
    return NextResponse.json(
      { message: "All demo sessions are busy right now. Please try again in a few minutes." },
      { status: 503 },
    );
  }

  let sandbox;
  try {
    sandbox = await createDemoSandbox(businessType);
  } catch (e) {
    console.error("DEMO SANDBOX ERROR:", e);
    return NextResponse.json({ message: "Could not prepare the demo. Please try again." }, { status: 500 });
  }

  const endsAt = sandbox.expiresAt.getTime();
  const maxAge = Math.max(60, Math.round((endsAt - Date.now()) / 1000));

  const res = NextResponse.json({
    user: {
      id: sandbox.userId,
      name: "Demo User",
      email: "demo@finovaos.app",
      role: "ADMIN",
      companyId: sandbox.companyId,
    },
    company: {
      id: sandbox.companyId,
      name: sandbox.companyName,
      businessType: sandbox.businessType,
    },
    sessionEndsAt: endsAt,
    minutes: DEMO_SESSION_MINUTES,
  });

  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  const cookieOpts = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
  res.cookies.set("sb_auth", sandbox.token, { ...cookieOpts, httpOnly: true });
  // Read by DemoSessionTimer to show the countdown and drive the wipe on exit.
  res.cookies.set(
    "finova_demo",
    JSON.stringify({ companyId: sandbox.companyId, endsAt }),
    { ...cookieOpts, httpOnly: false },
  );

  return res;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const businessType =
    (typeof body?.businessType === "string" ? body.businessType : null) ||
    req.nextUrl.searchParams.get("businessType");
  return start(req, businessType, { email: body?.email, password: body?.password });
}

export async function GET(req: NextRequest) {
  return start(req, req.nextUrl.searchParams.get("businessType"), {});
}
