import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { azureOpenAIClient, generateMarketingText, getErrorMessage, hasUsableAIKey } from "@/lib/marketingAutopilotAI";
import { requireAdmin } from "@/lib/adminAuth";


const MODEL  = (process.env.DALLE_MODEL   || "dall-e-3") as "dall-e-3" | "dall-e-2";
const SIZE   = (process.env.DALLE_SIZE    || "1024x1024") as "1024x1024" | "1024x1792" | "1792x1024";
const QUALITY = (process.env.DALLE_QUALITY || "standard") as "standard" | "hd";

/* ─── POST: generate image for a social media post ─── */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const role = req.headers.get("x-user-role") || "";
    if (role.toUpperCase() !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { postText, niche, platform, style } = await req.json();
    if (!postText) return NextResponse.json({ error: "postText required" }, { status: 400 });

    // Azure (Microsoft Foundry) first — that is where the credit is. Falls back
    // to a direct OpenAI key only when Azure is not configured.
    const azure = azureOpenAIClient();
    const azureImageDeployment = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT?.trim();
    const useAzure = Boolean(azure && azureImageDeployment);

    if (!useAzure && !hasUsableAIKey(process.env.OPENAI_API_KEY)) {
      return NextResponse.json(
        { error: "No image provider configured. Set AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY + AZURE_OPENAI_IMAGE_DEPLOYMENT, or OPENAI_API_KEY." },
        { status: 500 },
      );
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

    // Step 2 — generate the image
    const client = useAzure ? azure! : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const fullPrompt = `${imagePrompt}. Professional business marketing graphic, no text or typography, clean composition.`;

    // `quality` and `style` are DALL-E-3 specific. Azure deployments of other
    // image models reject them outright, so only send them on the direct path.
    const response = await client.images.generate(
      useAzure
        ? { model: azureImageDeployment!, prompt: fullPrompt, n: 1, size: SIZE }
        : { model: MODEL, prompt: fullPrompt, n: 1, size: SIZE, quality: QUALITY, style: "vivid" },
    );

    // Azure image models commonly return base64 rather than a hosted URL.
    const first = response.data?.[0];
    const imageUrl = first?.url || (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : undefined);
    if (!imageUrl) return NextResponse.json({ error: "Image generation failed" }, { status: 500 });

    return NextResponse.json({
      url:          imageUrl,
      imagePrompt,  // return so admin can see what prompt was used
      model:        useAzure ? azureImageDeployment : MODEL,
      provider:     useAzure ? "azure" : "openai",
      size:         SIZE,
    });

  } catch (e: unknown) {
    // A 400 from OpenAI is NOT always a content-policy rejection — a key
    // without image permissions, an org not verified for image generation, or
    // a model the account cannot reach all land here too. Reporting every one
    // of them as "try different post text" sends you rewriting copy that was
    // never the problem, so pass OpenAI's own message through.
    const err = e as { status?: number; code?: string; error?: { message?: string; code?: string }; message?: string };
    const detail = err?.error?.message || err?.message || "";
    const code = err?.error?.code || err?.code || "";

    if (err?.status === 400) {
      const isPolicy =
        /content[_ ]policy|safety system|rejected as a result of our safety/i.test(detail) ||
        code === "content_policy_violation";

      return NextResponse.json(
        {
          error: isPolicy
            ? "Image prompt was rejected by content policy. Try different post text."
            : `OpenAI rejected the image request: ${detail || "no detail returned"}`,
          openaiCode: code || null,
        },
        { status: 400 },
      );
    }

    console.error("[marketing-autopilot/image] generation failed:", err?.status, code, detail);
    return NextResponse.json({ error: getErrorMessage(e, "Image generation failed") }, { status: 500 });
  }
}
