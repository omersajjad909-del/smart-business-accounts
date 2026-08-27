import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askJson, clip } from "@/lib/ai/adminAI";
import { deleteAiAsset, getAiAsset, listAiAssets, saveAiAsset } from "@/lib/ai/aiStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Competitor Watch — what the alternatives charge, and what changed since last
 * time.
 *
 * The value is entirely in the diff. A single snapshot of the Xero pricing page
 * is something anyone can read in a browser; "Xero raised the Standard plan by
 * $3 and dropped the invoice limit" three weeks after it happened is not, and it
 * is the kind of thing that decides whether a price rise here is defensible.
 *
 * Fetching is best-effort and expected to fail sometimes. Most SaaS marketing
 * sites sit behind a bot filter that will refuse a server-side request, and a
 * page rendered entirely in JavaScript arrives as an empty shell. Rather than
 * pretend otherwise, the route returns a clear reason and the page offers a
 * paste box — copying a pricing page out of a browser takes ten seconds and
 * always works.
 *
 * Snapshots live in the generic AI asset store keyed by competitor slug, so
 * re-checking a competitor replaces its snapshot rather than growing a list.
 */

type Plan = {
  name: string;
  price: string;
  period: string;
  currency: string;
  seats: string;
  highlights: string[];
};

type Snapshot = {
  competitor: string;
  url: string;
  capturedAt: string;
  plans: Plan[];
  positioning: string;
  freeTrial: string;
  notableClaims: string[];
  /** Written on a re-check, comparing against the previous snapshot. */
  changes: string[];
  /** How the content was obtained, so a stale snapshot is recognisable. */
  method: "fetched" | "pasted";
};

/** Competitors worth watching, with the page that actually carries the prices. */
const SUGGESTED = [
  { name: "Xero", url: "https://www.xero.com/pk/pricing-plans/" },
  { name: "Zoho Books", url: "https://www.zoho.com/books/pricing/" },
  { name: "QuickBooks", url: "https://quickbooks.intuit.com/pricing/" },
  { name: "FreshBooks", url: "https://www.freshbooks.com/pricing" },
  { name: "Odoo", url: "https://www.odoo.com/pricing" },
  { name: "Wave", url: "https://www.waveapps.com/pricing" },
  { name: "Busy Accounting", url: "https://busy.in/pricing" },
  { name: "Marg ERP", url: "https://margcompusoft.com/m/pricing/" },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

/**
 * HTML to something a model can read.
 *
 * Scripts and styles are removed rather than stripped of tags — a pricing page
 * carries tens of kilobytes of inline JSON that would otherwise dominate the
 * extract and push the actual prices out of the context window.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchPage(url: string): Promise<{ text: string } | { error: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: "That is not a valid URL." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { error: "Only http and https URLs can be fetched." };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Without a browser-shaped Accept and User-Agent most marketing sites
        // return a challenge page rather than the pricing table.
        "User-Agent": "Mozilla/5.0 (compatible; FinovaOS-CompetitorWatch/1.0)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en",
      },
      cache: "no-store",
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      return { error: `The site answered ${res.status}. Most pricing pages block server-side requests — paste the page text instead.` };
    }

    const html = await res.text();
    const text = htmlToText(html);
    if (text.length < 400) {
      return { error: "The page came back nearly empty, which usually means it renders its prices in JavaScript. Paste the page text instead." };
    }
    return { text };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return { error: `Could not reach the page (${message}). Paste the page text instead.` };
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const stored = await listAiAssets<Snapshot>("competitor-snapshot", 60);
    return NextResponse.json({
      aiConfigured: aiConfigured(),
      snapshots: stored.map((s) => ({ id: s.id, key: s.key, title: s.title, createdAt: s.createdAt, data: s.data })),
      suggested: SUGGESTED,
    });
  } catch (err) {
    console.error("[competitor-watch] GET failed:", err);
    return NextResponse.json({ error: "Could not load stored snapshots" }, { status: 500 });
  }
}

const EXTRACT_SYSTEM = `
You read the text of a competitor's pricing page and pull out the facts.

Return one JSON object:
  plans          array of { name, price, period, currency, seats, highlights }
                 price is the number exactly as printed, as a string. period is
                 "month", "year", "one-time" or whatever the page says. seats is
                 the user or seat limit as printed, or "not stated".
                 highlights: at most four short phrases, the things this plan
                 includes that the cheaper one does not.
  positioning    two sentences: who this product is for, in their own framing.
  freeTrial      what they offer to get someone started, as printed ("30-day
                 free trial", "50% off 3 months", "none stated").
  notableClaims  up to five specific claims worth knowing about — a customer
                 count, an integration count, a certification, a guarantee.

Rules:
- Copy prices character for character. Never convert a currency, never round,
  never annualise a monthly figure.
- If the page shows regional pricing, take the region the text is written for
  and say which in positioning.
- A field the text does not contain is "not stated". Never fill a gap.
- If the text is not a pricing page at all, return plans as an empty array and
  say so in positioning.
`;

const DIFF_SYSTEM = `
You compare two snapshots of the same competitor pricing page, taken at
different times, and list what actually changed.

Return a JSON array of short strings. Each one names a concrete change:
a price, a plan added or removed, a limit, a trial offer, a claim.

Rules:
- Only report differences you can point at in both snapshots. Do not report a
  change caused by the pages being worded differently.
- Say the direction and the size: "Standard rose from $37 to $42 a month".
- If nothing meaningful changed, return an empty array.
`;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string; url?: string; pastedText?: string;
    };

    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name the competitor first" }, { status: 400 });

    let text: string;
    let method: Snapshot["method"];

    if (body.pastedText && String(body.pastedText).trim().length > 200) {
      text = String(body.pastedText);
      method = "pasted";
    } else {
      const url = String(body.url || "").trim();
      if (!url) return NextResponse.json({ error: "Give a URL to fetch, or paste the page text" }, { status: 400 });
      const fetched = await fetchPage(url);
      if ("error" in fetched) return NextResponse.json({ error: fetched.error }, { status: 502 });
      text = fetched.text;
      method = "fetched";
    }

    const extracted = await askJson<Omit<Snapshot, "competitor" | "url" | "capturedAt" | "changes" | "method">>(
      EXTRACT_SYSTEM,
      clip(text, 24000),
      2400,
    );

    if (!extracted || !Array.isArray(extracted.plans)) {
      return NextResponse.json({ error: "Nothing could be extracted from that page. Try pasting just the pricing section." }, { status: 502 });
    }

    const key = slugify(name);
    const previous = await getAiAsset<Snapshot>("competitor-snapshot", key);

    let changes: string[] = [];
    if (previous?.data?.plans?.length && extracted.plans.length) {
      const diff = await askJson<string[]>(
        DIFF_SYSTEM,
        [
          `Competitor: ${name}`,
          ``,
          `PREVIOUS SNAPSHOT (${previous.data.capturedAt}):`,
          JSON.stringify({ plans: previous.data.plans, freeTrial: previous.data.freeTrial, notableClaims: previous.data.notableClaims }, null, 2),
          ``,
          `NEW SNAPSHOT (today):`,
          JSON.stringify({ plans: extracted.plans, freeTrial: extracted.freeTrial, notableClaims: extracted.notableClaims }, null, 2),
        ].join("\n"),
        1200,
      );
      if (Array.isArray(diff)) changes = diff.filter((c) => typeof c === "string");
    }

    const snapshot: Snapshot = {
      competitor: name,
      url: String(body.url || "").trim(),
      capturedAt: new Date().toISOString(),
      plans: extracted.plans,
      positioning: extracted.positioning || "",
      freeTrial: extracted.freeTrial || "not stated",
      notableClaims: extracted.notableClaims || [],
      changes,
      method,
    };

    const saved = await saveAiAsset({
      kind: "competitor-snapshot",
      key,
      title: name,
      data: snapshot,
      admin: { id: admin.id, email: admin.email },
    });

    return NextResponse.json({
      id: saved.id,
      snapshot,
      hadPrevious: Boolean(previous),
      previousCapturedAt: previous?.data?.capturedAt ?? null,
    });
  } catch (err) {
    console.error("[competitor-watch] POST failed:", err);
    return NextResponse.json({ error: "The competitor could not be checked" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const removed = await deleteAiAsset(id);
  return NextResponse.json({ removed });
}
