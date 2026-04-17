/**
 * Social Media Auto-Posting API
 *
 * Supports: Facebook Pages, Instagram (via Graph API), LinkedIn
 *
 * GET  /api/automation/social              — get platform configs + scheduled posts
 * PUT  /api/automation/social              — save platform credentials
 * POST /api/automation/social              — create/schedule a post
 * POST /api/automation/social?action=publish&id=... — publish a scheduled post now
 * POST /api/automation/social?action=trigger        — internal: publish due posts (cron)
 * DELETE /api/automation/social?id=...    — delete scheduled post
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAutomationCompanyId, getSocialConfig, saveSocialConfig } from "@/lib/automationHelpers";

async function ensureSocialTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SocialPost" (
      "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId"   TEXT NOT NULL,
      "platforms"   TEXT NOT NULL DEFAULT '[]',
      "content"     TEXT NOT NULL,
      "imageUrl"    TEXT,
      "status"      TEXT NOT NULL DEFAULT 'scheduled',
      "scheduledAt" TIMESTAMP(3),
      "publishedAt" TIMESTAMP(3),
      "results"     TEXT NOT NULL DEFAULT '{}',
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSocialTables();

    const config = await getSocialConfig(companyId);
    const posts = await prisma.$queryRaw<any[]>`
      SELECT id, platforms, content, "imageUrl", status, "scheduledAt", "publishedAt", results, "createdAt"
      FROM "SocialPost"
      WHERE "companyId" = ${companyId}
      ORDER BY "createdAt" DESC
      LIMIT 100
    `.catch(() => []);

    return NextResponse.json({
      config: {
        facebook: { connected: Boolean(config.facebook?.accessToken), pageId: config.facebook?.pageId || "" },
        instagram: { connected: Boolean(config.instagram?.accessToken), accountId: config.instagram?.accountId || "" },
        linkedin: { connected: Boolean(config.linkedin?.accessToken), orgId: config.linkedin?.orgId || "" },
      },
      posts: posts.map(p => ({
        ...p,
        platforms: JSON.parse(p.platforms || "[]"),
        results: JSON.parse(p.results || "{}"),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── PUT — save platform credentials ─────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const current = await getSocialConfig(companyId);
    const next = { ...current };
    if (body.facebook) next.facebook = { ...current.facebook, ...body.facebook };
    if (body.instagram) next.instagram = { ...current.instagram, ...body.instagram };
    if (body.linkedin) next.linkedin = { ...current.linkedin, ...body.linkedin };

    await saveSocialConfig(companyId, next);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSocialTables();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "publish") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      return publishPost(id, companyId);
    }

    if (action === "trigger") {
      return triggerDuePosts(companyId);
    }

    // Create/schedule post
    const body = await req.json();
    const { content, platforms = [], imageUrl, scheduledAt } = body;

    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });
    if (!platforms.length) return NextResponse.json({ error: "at least one platform required" }, { status: 400 });

    const schedAt = scheduledAt ? new Date(scheduledAt) : null;
    const status = schedAt && schedAt > new Date() ? "scheduled" : "pending";

    await prisma.$executeRaw`
      INSERT INTO "SocialPost" ("companyId", "platforms", "content", "imageUrl", "status", "scheduledAt")
      VALUES (${companyId}, ${JSON.stringify(platforms)}, ${content}, ${imageUrl || null}, ${status}, ${schedAt})
    `;

    // Publish immediately if no schedule
    if (status === "pending") {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "SocialPost" WHERE "companyId" = ${companyId}
        ORDER BY "createdAt" DESC LIMIT 1
      `.catch(() => [] as { id: string }[]);
      if (rows[0]) {
        publishPost(rows[0].id, companyId).catch(console.error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await ensureSocialTables();
    await prisma.$executeRaw`DELETE FROM "SocialPost" WHERE "id" = ${id} AND "companyId" = ${companyId}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── Publish a post ───────────────────────────────────────────────────────────
async function publishPost(postId: string, companyId: string): Promise<NextResponse> {
  const rows = await prisma.$queryRaw<{ platforms: string; content: string; imageUrl: string | null }[]>`
    SELECT platforms, content, "imageUrl" FROM "SocialPost"
    WHERE "id" = ${postId} AND "companyId" = ${companyId} LIMIT 1
  `.catch(() => [] as { platforms: string; content: string; imageUrl: string | null }[]);

  if (!rows[0]) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const { platforms, content, imageUrl } = rows[0];
  const platformList: string[] = JSON.parse(platforms || "[]");
  const config = await getSocialConfig(companyId);
  const results: Record<string, any> = {};

  for (const platform of platformList) {
    try {
      if (platform === "facebook") {
        results.facebook = await postToFacebook(content, imageUrl, config.facebook);
      } else if (platform === "instagram") {
        results.instagram = await postToInstagram(content, imageUrl, config.instagram);
      } else if (platform === "linkedin") {
        results.linkedin = await postToLinkedIn(content, imageUrl, config.linkedin);
      }
    } catch (e: any) {
      results[platform] = { error: e?.message };
    }
  }

  const allFailed = Object.values(results).every((r: any) => r?.error);

  await prisma.$executeRaw`
    UPDATE "SocialPost"
    SET "status" = ${allFailed ? "failed" : "published"},
        "publishedAt" = ${new Date()},
        "results" = ${JSON.stringify(results)}
    WHERE "id" = ${postId}
  `.catch(() => {});

  return NextResponse.json({ success: !allFailed, results });
}

async function triggerDuePosts(companyId: string): Promise<NextResponse> {
  await ensureSocialTables();
  const now = new Date();
  const due = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "SocialPost"
    WHERE "companyId" = ${companyId}
      AND "status" = 'scheduled'
      AND "scheduledAt" <= ${now}
    LIMIT 20
  `.catch(() => [] as { id: string }[]);

  let published = 0;
  for (const post of due) {
    const res = await publishPost(post.id, companyId);
    const data = await res.json();
    if (data.success) published++;
  }

  return NextResponse.json({ success: true, published });
}

// ─── Platform publishers ──────────────────────────────────────────────────────
async function postToFacebook(content: string, imageUrl: string | null, cfg: any) {
  if (!cfg?.accessToken || !cfg?.pageId) throw new Error("Facebook not configured");

  let url: string;
  let body: Record<string, string>;

  if (imageUrl) {
    url = `https://graph.facebook.com/v18.0/${cfg.pageId}/photos`;
    body = { message: content, url: imageUrl, access_token: cfg.accessToken };
  } else {
    url = `https://graph.facebook.com/v18.0/${cfg.pageId}/feed`;
    body = { message: content, access_token: cfg.accessToken };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Facebook post failed");
  return { postId: data.id };
}

async function postToInstagram(content: string, imageUrl: string | null, cfg: any) {
  if (!cfg?.accessToken || !cfg?.accountId) throw new Error("Instagram not configured");
  // Instagram Graph API requires an image — text-only posts are not supported
  if (!imageUrl) throw new Error("Instagram requires an image. Add an image URL to post on Instagram.");

  // Step 1: create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${cfg.accountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption: content, access_token: cfg.accessToken }),
    }
  );
  const container = await containerRes.json();
  if (!container.id) throw new Error(container?.error?.message || "Instagram container failed");

  // Step 2: publish container
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${cfg.accountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: cfg.accessToken }),
    }
  );
  const published = await publishRes.json();
  if (!publishRes.ok) throw new Error(published?.error?.message || "Instagram publish failed");
  return { postId: published.id };
}

async function postToLinkedIn(content: string, imageUrl: string | null, cfg: any) {
  if (!cfg?.accessToken || !cfg?.orgId) throw new Error("LinkedIn not configured");
  const author = `urn:li:organization:${cfg.orgId}`;

  // Text-only post
  if (!imageUrl) {
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202406",
      },
      body: JSON.stringify({
        author,
        commentary: content,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d?.message || "LinkedIn post failed");
    }
    const postId = res.headers.get("x-restli-id") || "";
    return { postId };
  }

  // Image post — Step 1: initialize upload
  const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202406",
    },
    body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
  });
  const initData = await initRes.json();
  const uploadUrl = initData?.value?.uploadUrl;
  const imageUrn = initData?.value?.image;
  if (!uploadUrl || !imageUrn) throw new Error("LinkedIn image upload init failed");

  // Step 2: upload image bytes
  const imgRes = await fetch(imageUrl);
  const imgBuffer = await imgRes.arrayBuffer();
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "image/jpeg" },
    body: imgBuffer,
  });

  // Step 3: create post with image
  const postRes = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202406",
    },
    body: JSON.stringify({
      author,
      commentary: content,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { media: { id: imageUrn } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!postRes.ok) {
    const d = await postRes.json().catch(() => ({}));
    throw new Error(d?.message || "LinkedIn post failed");
  }
  return { postId: postRes.headers.get("x-restli-id") || "" };
}
