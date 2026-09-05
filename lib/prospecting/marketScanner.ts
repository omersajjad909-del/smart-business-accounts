/**
 * Market Scanner — Agent #1 of the AI Growth Department.
 *
 * Finds public pain signals matching the PVC/plastics costing-software
 * vocabulary validated in docs/growth/manual-lead-round.md. It never contacts
 * anyone: Reddit bans cold pitches, so this only surfaces the post for a human
 * to reply to publicly first (see that doc, section 4).
 *
 * Source: Reddit's own RSS/Atom feed (`/r/<sub>/new/.rss`), not the JSON API.
 * The JSON endpoints (`/r/<sub>/new.json`) now redirect unauthenticated,
 * server-side requests to a login wall — confirmed by hand, not assumed — and
 * registering a Reddit API app is currently gated behind their "Responsible
 * Builder Policy" review, so OAuth is not available either. The RSS feed is
 * still public and unauthenticated, and carries the full post body, so it is
 * the only working free path today. If OAuth opens up later, swap the fetch
 * in `fetchSubredditFeed` for `oauth.reddit.com` — everything below it
 * (classification, storage) stays the same.
 */

import { prisma } from "@/lib/prisma";

const db = prisma as any;

const REDDIT_UA = "FinovaOS-MarketScanner/1.0 (contact: umersajjad981@gmail.com)";

export const TARGET_SUBREDDITS = [
  "injectionmolding", "manufacturing", "smallbusiness", "QuickBooks",
  "ERP", "Accounting", "Bookkeeping", "Entrepreneur", "pakistan", "dubai",
];

// ─── Vocabulary — from docs/growth/manual-lead-round.md ───────────────────────
// A lead is A (industry) + B (pain) in the same post, or C (software pain)
// alone as a weaker "maybe, verify industry" signal. B alone or A alone is
// noise — see that doc for why.

const A_INDUSTRY = [
  "pvc pipe", "upvc", "u-pvc", "pvc fittings", "pvc compound", "pvc resin",
  "rigid pvc", "flexible pvc", "plastic granules", "masterbatch", "regrind",
  "virgin resin", "injection molding", "injection moulding", "blow molding",
  "blow moulding", "extrusion", "profile extrusion", "sheet extrusion",
  "calendering", "thermoforming", "hdpe", "ldpe", "lldpe",
];

const B_PAIN = [
  "cost per kg", "cost per piece", "cost per part", "costing sheet",
  "product costing", "bill of materials", "formulation", "blend ratio",
  "batch costing", "job costing", "scrap rate", "wastage",
  "material variance", "landed cost", "work in process",
  "machine hour rate", "overhead allocation", "standard cost",
];

const C_SOFTWARE = [
  "outgrew quickbooks", "quickbooks manufacturing", "quickbooks inventory",
  "tally limitations", "tally manufacturing", "zoho inventory", "zoho books",
  "excel nightmare", "spreadsheet mess", "need an erp", "need erp",
  "mrp for small", "erp too expensive", "erp implementation failed",
  "fishbowl alternative", "katana alternative", "odoo too complex",
];

function matches(haystack: string, needles: string[]): string[] {
  const lower = ` ${haystack.toLowerCase()} `;
  return needles.filter((kw) => lower.includes(kw));
}

function classify(text: string): {
  tier: "A" | "B" | "C" | null;
  industry: string[];
  pain: string[];
  software: string[];
} {
  const industry = matches(text, A_INDUSTRY);
  const pain = matches(text, B_PAIN);
  const software = matches(text, C_SOFTWARE);

  if (software.length && industry.length) return { tier: "A", industry, pain, software };
  if (pain.length && industry.length) return { tier: "B", industry, pain, software };
  if (software.length) return { tier: "C", industry, pain, software };
  return { tier: null, industry, pain, software };
}

// ─── Atom feed parsing — dependency-free, same philosophy as enrichment.ts's
// htmlToText: crude but good enough, and one less package to trust. ──────────

function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

function stripHtml(html: string): string {
  return decodeEntities(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type FeedEntry = {
  postId: string;
  title: string;
  url: string;
  author: string | null;
  bodyText: string;
};

function parseAtomEntries(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const blocks = xml.split("<entry>").slice(1); // first chunk is feed header, not a post

  for (const block of blocks) {
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = block.match(/<link href="([^"]*)"/);
    const authorMatch = block.match(/<name>([^<]*)<\/name>/);
    const contentMatch = block.match(/<content type="html">([\s\S]*?)<\/content>/);

    const url = linkMatch?.[1] || "";
    // Reddit permalinks: .../comments/<id>/<slug>/ — the id is the stable key.
    const idMatch = url.match(/\/comments\/([a-z0-9]+)\//i);
    if (!idMatch || !titleMatch) continue;

    entries.push({
      postId: idMatch[1],
      title: decodeEntities(titleMatch[1]).trim(),
      url,
      author: authorMatch ? authorMatch[1].trim() : null,
      bodyText: contentMatch ? stripHtml(contentMatch[1]) : "",
    });
  }

  return entries;
}

async function fetchSubredditFeed(subreddit: string): Promise<FeedEntry[]> {
  const res = await fetch(`https://www.reddit.com/r/${subreddit}/new/.rss?limit=40`, {
    headers: { "User-Agent": REDDIT_UA },
  });
  if (!res.ok) {
    console.error(`[market-scanner] r/${subreddit} feed failed: HTTP ${res.status}`);
    return [];
  }
  const xml = await res.text();
  return parseAtomEntries(xml);
}

export type ScannedSignal = {
  source: "reddit";
  subreddit: string;
  externalId: string;
  url: string;
  title: string;
  snippet: string | null;
  author: string | null;
  matchedIndustry: string[];
  matchedPain: string[];
  matchedSoftware: string[];
  tier: "A" | "B" | "C";
};

export async function scanReddit(): Promise<{ signals: ScannedSignal[]; scanned: number }> {
  const signals: ScannedSignal[] = [];
  let scanned = 0;

  for (const subreddit of TARGET_SUBREDDITS) {
    const entries = await fetchSubredditFeed(subreddit);
    scanned += entries.length;

    for (const entry of entries) {
      const result = classify(`${entry.title} ${entry.bodyText}`);
      if (!result.tier) continue;

      signals.push({
        source: "reddit",
        subreddit,
        externalId: entry.postId,
        url: entry.url,
        title: entry.title,
        snippet: entry.bodyText ? entry.bodyText.slice(0, 600) : null,
        author: entry.author,
        matchedIndustry: result.industry,
        matchedPain: result.pain,
        matchedSoftware: result.software,
        tier: result.tier,
      });
    }

    // Same courtesy gap as the old JSON approach: don't hammer ten subreddits
    // back to back from one IP.
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { signals, scanned };
}

/** Persists newly-found signals. Never overwrites one a human may have already reviewed. */
export async function scanAndStore(): Promise<{ scanned: number; found: number; stored: number }> {
  const { signals, scanned } = await scanReddit();
  let stored = 0;

  for (const signal of signals) {
    try {
      const existing = await db.marketSignal.findUnique({
        where: { source_externalId: { source: signal.source, externalId: signal.externalId } },
      });
      if (existing) continue;

      await db.marketSignal.create({
        data: {
          source: signal.source,
          subreddit: signal.subreddit,
          externalId: signal.externalId,
          url: signal.url,
          title: signal.title,
          snippet: signal.snippet,
          author: signal.author,
          matchedIndustry: signal.matchedIndustry,
          matchedPain: signal.matchedPain,
          matchedSoftware: signal.matchedSoftware,
          tier: signal.tier,
        },
      });
      stored++;
    } catch (error) {
      console.error("[market-scanner] failed to store signal:", error);
    }
  }

  return { scanned, found: signals.length, stored };
}
