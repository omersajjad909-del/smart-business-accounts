import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askJson } from "@/lib/ai/adminAI";
import { brandContext, checkForbiddenClaims } from "@/lib/ai/productBrief";
import { deleteAiAsset, listAiAssets, saveAiAsset } from "@/lib/ai/aiStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SEO / GEO Content Engine — long-tail page briefs, written to be found by
 * search engines and quotable by answer engines.
 *
 * What this produces is a brief, not a deployed page. A route that wrote .tsx
 * files into the repo would be a code generator wired to a chat model with no
 * review step, and the marketing site is the one surface where a hallucinated
 * sentence is published under the company name. The brief is copied into a page
 * by hand, which takes ten minutes and means somebody read it.
 *
 * "GEO" is the part worth explaining. An answer engine quotes a page when the
 * page states a fact plainly, in one sentence, near a question it answers. So
 * every brief carries a FAQ block written as question and self-contained
 * answer, and the JSON-LD to mark it up. That is the whole technique; the rest
 * is ordinary on-page SEO.
 *
 * Every draft is run past checkForbiddenClaims. Marketing copy is where a model
 * reaches for a free trial and a customer count, and this product has neither.
 */

/**
 * Real routes on the marketing site, for internal linking.
 *
 * Hardcoded rather than read from the filesystem: app/(marketing) exists in the
 * repo but not in the deployed build output, so a directory scan works locally
 * and returns nothing in production. Add a line when a route is added.
 */
const SITE_ROUTES = [
  "/pricing", "/features", "/industries", "/solutions", "/compare",
  "/case-studies", "/testimonials", "/roi-calculator", "/demo", "/get-started",
  "/integrations", "/security", "/trust", "/faq", "/help", "/docs", "/blog",
  "/about", "/contact", "/support", "/developers/api", "/roles", "/changelog",
];

/** Route patterns that take a slug, so a link can be proposed for a real one. */
const SITE_PATTERNS = [
  "/for/[industry]  — industry landing pages",
  "/compare/[competitor]  — comparison pages",
  "/features/[slug]  — single-feature pages",
  "/help/[slug]  — help articles",
  "/blog/[slug]  — blog posts",
];

type Draft = {
  keyword: string;
  intent: string;
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  sections: Array<{ heading: string; body: string }>;
  faq: Array<{ question: string; answer: string }>;
  internalLinks: Array<{ href: string; anchor: string; why: string }>;
  keywordsCovered: string[];
  jsonLd: string;
  flags: string[];
  createdAt: string;
};

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const stored = await listAiAssets<Draft>("seo-draft", 100);
    return NextResponse.json({
      aiConfigured: aiConfigured(),
      drafts: stored.map((s) => ({ id: s.id, key: s.key, title: s.title, createdAt: s.createdAt, data: s.data })),
      routes: SITE_ROUTES,
      patterns: SITE_PATTERNS,
    });
  } catch (err) {
    console.error("[seo-engine] GET failed:", err);
    return NextResponse.json({ error: "Could not load drafts" }, { status: 500 });
  }
}

const WRITE_SYSTEM = `
${brandContext()}

You write the brief for one long-tail landing page on the FinovaOS marketing
site. It targets a specific search — an industry, a place, a job to be done —
and it has to work in two places at once: a search results page, and an answer
engine quoting a source.

Return one JSON object:

  intent            one sentence: what the person searching this actually wants.
                    If they want something FinovaOS does not do, say so — that
                    is a page not worth writing, and you should say that too.
  slug              url-safe, lower case, hyphens, no leading slash
  title             the <title>. Under 60 characters. Reads like a person wrote
                    it. No pipe-separated keyword stuffing.
  metaDescription   under 155 characters, one specific promise, no adjectives
  h1                the visible headline. Different wording from the title.
  sections          four to seven { heading, body }. body is one to three short
                    paragraphs of real prose. Lead each section with the
                    concrete thing, then the explanation. Name the actual
                    features involved. Do not write filler.
  faq               five to eight { question, answer }. This is the part answer
                    engines quote, so:
                      - the question is phrased the way someone would type or
                        say it
                      - the answer is ONE self-contained paragraph, 40-70 words,
                        that makes sense quoted on its own with no page around
                        it. State the fact in the first sentence.
                      - never answer with "it depends" or "contact us"
  internalLinks     three to six { href, anchor, why }. href must come from the
                    route list you are given, or follow one of the patterns with
                    a real slug filled in. Never invent a route.
  keywordsCovered   the searches this page should rank for, including the
                    Roman Urdu or local phrasing where that is how people search

Writing rules on top of the voice above:
- Write for someone who runs the business, not for a search engine. Keyword
  density is not a goal.
- Every claim must be true of FinovaOS as described in the brief. If the page
  needs a feature that does not exist, leave it out and note it in intent.
- No statistics, no percentages, no customer counts, no awards. None of them
  can be sourced.
- Never mention a free trial. The calls to action are "Get Started",
  "View Pricing", "Book a Demo".
`;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      keyword?: string;
      audience?: string;
      angle?: string;
    };

    const keyword = String(body.keyword || "").trim();
    if (!keyword) return NextResponse.json({ error: "Give the search this page targets" }, { status: 400 });
    if (keyword.length > 200) return NextResponse.json({ error: "That is too long for a target search" }, { status: 400 });

    const generated = await askJson<Omit<Draft, "keyword" | "jsonLd" | "flags" | "createdAt">>(
      WRITE_SYSTEM,
      [
        `Target search: ${keyword}`,
        body.audience ? `Who is searching it: ${String(body.audience).slice(0, 400)}` : "",
        body.angle ? `Angle the founder wants: ${String(body.angle).slice(0, 400)}` : "",
        ``,
        `Routes that exist on the site, for internal links:`,
        ...SITE_ROUTES.map((r) => `  ${r}`),
        ``,
        `Route patterns that take a slug:`,
        ...SITE_PATTERNS.map((p) => `  ${p}`),
      ].filter(Boolean).join("\n"),
      4000,
    );

    if (!generated || !Array.isArray(generated.sections)) {
      return NextResponse.json({ error: "The model did not return a usable draft. Try again." }, { status: 502 });
    }

    // Links to routes that do not exist are the one error here that costs
    // something real — a 404 from the marketing site, found by a crawler.
    const validLinks = (generated.internalLinks || []).filter((l) => {
      const href = String(l?.href || "");
      if (SITE_ROUTES.includes(href)) return true;
      return /^\/(for|compare|features|help|blog)\/[a-z0-9-]+$/.test(href);
    });
    const droppedLinks = (generated.internalLinks || [])
      .filter((l) => !validLinks.includes(l))
      .map((l) => l?.href)
      .filter(Boolean) as string[];

    const faq = (generated.faq || []).filter((f) => f?.question && f?.answer);

    const jsonLd = faq.length
      ? JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }, null, 2)
      : "";

    const allText = [
      generated.title, generated.metaDescription, generated.h1,
      ...(generated.sections || []).map((s) => `${s.heading} ${s.body}`),
      ...faq.map((f) => `${f.question} ${f.answer}`),
    ].join("\n");
    const flags = checkForbiddenClaims(allText);

    const draft: Draft = {
      keyword,
      intent: generated.intent || "",
      slug: generated.slug || "",
      title: generated.title || "",
      metaDescription: generated.metaDescription || "",
      h1: generated.h1 || "",
      sections: generated.sections,
      faq,
      internalLinks: validLinks,
      keywordsCovered: generated.keywordsCovered || [],
      jsonLd,
      flags,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ draft, droppedLinks });
  } catch (err) {
    console.error("[seo-engine] POST failed:", err);
    return NextResponse.json({ error: "The draft could not be written" }, { status: 500 });
  }
}

/** Keep a draft. Separate from generating it, so nothing is stored unread. */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const { draft } = (await req.json().catch(() => ({}))) as { draft?: Draft };
    if (!draft?.keyword) return NextResponse.json({ error: "Nothing to save" }, { status: 400 });

    const key = (draft.slug || draft.keyword).toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

    const saved = await saveAiAsset({
      kind: "seo-draft",
      key,
      title: draft.title || draft.keyword,
      data: draft,
      admin: { id: admin.id, email: admin.email },
    });
    return NextResponse.json({ id: saved.id });
  } catch (err) {
    console.error("[seo-engine] PUT failed:", err);
    return NextResponse.json({ error: "Could not save the draft" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  return NextResponse.json({ removed: await deleteAiAsset(id) });
}
