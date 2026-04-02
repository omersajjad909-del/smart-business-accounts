import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-auth") === process.env.ADMIN_SECRET ||
    req.headers.get("x-user-role") === "ADMIN";
}

export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const log = await prisma.activityLog.findFirst({
      where: { action: "SOCIAL_CONFIG" },
      orderBy: { createdAt: "desc" },
    });

    const settings = log?.details ? JSON.parse(log.details) : getDefaultSettings();
    // Strip tokens from public fields before returning
    return NextResponse.json({ settings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    await prisma.activityLog.create({
      data: {
        action: "SOCIAL_CONFIG",
        details: JSON.stringify(body),
        userId: null,
        companyId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function getDefaultSettings() {
  return {
    facebook:  { enabled: false, pageUrl: "", pageId: "", accessToken: "" },
    instagram: { enabled: false, pageUrl: "", igUserId: "", accessToken: "" },
    twitter:   { enabled: false, pageUrl: "", bearerToken: "", apiKey: "", apiSecret: "", accessToken: "", accessTokenSecret: "" },
    linkedin:  { enabled: false, pageUrl: "", orgId: "", accessToken: "" },
    tiktok:    { enabled: false, pageUrl: "" },
    youtube:   { enabled: false, pageUrl: "", channelId: "" },
  };
}
