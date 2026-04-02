import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-auth") === process.env.ADMIN_SECRET ||
    req.headers.get("x-user-role") === "ADMIN";
}

async function postToFacebook(
  settings: any,
  text: string,
  mediaUrl?: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { pageId, accessToken } = settings.facebook;
    if (!pageId || !accessToken) return { success: false, error: "Facebook not configured" };

    const endpoint = mediaUrl
      ? `https://graph.facebook.com/v19.0/${pageId}/photos`
      : `https://graph.facebook.com/v19.0/${pageId}/feed`;

    const payload: Record<string, string> = mediaUrl
      ? { url: mediaUrl, message: text, access_token: accessToken }
      : { message: text, access_token: accessToken };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error?.message || "Facebook error" };
    return { success: true, id: data.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function postToInstagram(
  settings: any,
  text: string,
  mediaUrl?: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { igUserId, accessToken } = settings.instagram;
    if (!igUserId || !accessToken) return { success: false, error: "Instagram not configured" };
    if (!mediaUrl) return { success: false, error: "Instagram requires an image or video URL" };

    // Step 1: Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: mediaUrl, caption: text, access_token: accessToken }),
    });
    const container = await containerRes.json();
    if (!containerRes.ok) return { success: false, error: container.error?.message || "Instagram container error" };

    // Step 2: Publish
    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
    });
    const published = await publishRes.json();
    if (!publishRes.ok) return { success: false, error: published.error?.message || "Instagram publish error" };
    return { success: true, id: published.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function postToTwitter(
  settings: any,
  text: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { bearerToken } = settings.twitter;
    if (!bearerToken) return { success: false, error: "Twitter/X not configured — Bearer Token required" };

    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.detail || data.title || "Twitter error" };
    return { success: true, id: data.data?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function postToLinkedIn(
  settings: any,
  text: string,
  mediaUrl?: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { orgId, accessToken } = settings.linkedin;
    if (!orgId || !accessToken) return { success: false, error: "LinkedIn not configured" };

    const body: any = {
      author: `urn:li:organization:${orgId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: mediaUrl ? "IMAGE" : "NONE",
          ...(mediaUrl ? {
            media: [{
              status: "READY",
              originalUrl: mediaUrl,
            }],
          } : {}),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message || "LinkedIn error" };
    return { success: true, id: data.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { text, mediaUrl, platforms, scheduleAt } = await req.json() as {
      text: string;
      mediaUrl?: string;
      platforms: string[]; // ["facebook","instagram","twitter","linkedin"]
      scheduleAt?: string; // ISO date string, null = post now
    };

    if (!text?.trim()) return NextResponse.json({ error: "Post text is required" }, { status: 400 });
    if (!platforms?.length) return NextResponse.json({ error: "Select at least one platform" }, { status: 400 });

    // Load current social settings
    const settingsLog = await prisma.activityLog.findFirst({
      where: { action: "SOCIAL_CONFIG" },
      orderBy: { createdAt: "desc" },
    });
    const settings = settingsLog?.details ? JSON.parse(settingsLog.details) : {};

    // Post to each platform
    const results: Record<string, { success: boolean; id?: string; error?: string }> = {};

    await Promise.all(
      platforms.map(async (platform) => {
        switch (platform) {
          case "facebook":
            results.facebook = await postToFacebook(settings, text, mediaUrl);
            break;
          case "instagram":
            results.instagram = await postToInstagram(settings, text, mediaUrl);
            break;
          case "twitter":
            results.twitter = await postToTwitter(settings, text);
            break;
          case "linkedin":
            results.linkedin = await postToLinkedIn(settings, text, mediaUrl);
            break;
          default:
            results[platform] = { success: false, error: `${platform} API not yet integrated` };
        }
      })
    );

    const anySuccess = Object.values(results).some((r) => r.success);

    // Save post to history
    await prisma.activityLog.create({
      data: {
        action: "SOCIAL_POST",
        details: JSON.stringify({ text, mediaUrl, platforms, results, scheduleAt, postedAt: new Date().toISOString() }),
        userId: null,
        companyId: null,
      },
    });

    return NextResponse.json({ success: anySuccess, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const posts = await prisma.activityLog.findMany({
      where: { action: "SOCIAL_POST" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        createdAt: p.createdAt,
        ...(p.details ? JSON.parse(p.details) : {}),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
