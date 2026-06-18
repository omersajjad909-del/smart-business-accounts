import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateMarketingText, getErrorMessage, hasUsableAIKey } from "@/lib/marketingAutopilotAI";


const MODEL  = (process.env.DALLE_MODEL   || "dall-e-3") as "dall-e-3" | "dall-e-2";
const SIZE   = (process.env.DALLE_SIZE    || "1024x1024") as "1024x1024" | "1024x1792" | "1792x1024";
const QUALITY = (process.env.DALLE_QUALITY || "standard") as "standard" | "hd";

/* ─── POST: generate image for a social media post ─── */
export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role") || "";
    if (role.toUpperCase() !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { postText, niche, platform, style } = await req.json();
    if (!postText) return NextResponse.json({ error: "postText required" }, { status: 400 });
    if (!hasUsableAIKey(process.env.OPENAI_API_KEY)) {
      return NextResponse.json({ error: "OpenAI API key not configured for image generation" }, { status: 500 });
    }

    // Step 1 — use the configured text model to write a precise DALL-E prompt
    const imagePrompt = await generateMarketingText(`You are an expert at writing DALL-E 3 image generation prompts for social media marketing graphics.

Create a DALL-E 3 image prompt for this social media post for FinovaOS (a business accounting software):

Post text: "${postText}"
Platform: ${platform || "Instagram/Facebook"}
Business niche: ${niche || "trading/wholesale business"}
Visual style: ${style || "modern, professional, clean"}

Requirements:
- The image should be a professional marketing graphic
- Dark or gradient background (deep navy, dark blue, or dark purple)
- Clean, modern, corporate style
- Relevant to the post topic and the business niche
- No text or words in the image (DALL-E is bad at text)
- Should feel premium and trustworthy
- Could include: graphs, dashboards, business people, office settings, product displays, money/finance symbols, global/tech imagery
- Photorealistic or high-quality digital art

Write ONLY the image prompt, nothing else. Keep it under 150 words.`, 400);

    // Step 2 — generate image with DALL-E 3
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.images.generate({
      model:   MODEL,
      prompt:  `${imagePrompt}. Professional business marketing graphic, no text or typography, clean composition.`,
      n:       1,
      size:    SIZE,
      quality: QUALITY,
      style:   "vivid",
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) return NextResponse.json({ error: "Image generation failed" }, { status: 500 });

    return NextResponse.json({
      url:          imageUrl,
      imagePrompt,  // return so admin can see what prompt was used
      model:        MODEL,
      size:         SIZE,
    });

  } catch (e: unknown) {
    // OpenAI content policy errors
    if (typeof e === "object" && e && "status" in e && e.status === 400) {
      return NextResponse.json({ error: "Image prompt was rejected by content policy. Try different post text." }, { status: 400 });
    }
    return NextResponse.json({ error: getErrorMessage(e, "Image generation failed") }, { status: 500 });
  }
}
