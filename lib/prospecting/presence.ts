/**
 * Finding a company's online presence when the directory listing has none.
 *
 * Most small Pakistani traders are on Google Maps with a phone number and no
 * website. Gemini (with Google Search grounding) can often find the website or
 * a Facebook/Instagram page, but a language model will also happily name the
 * wrong business, so nothing it says is trusted on its own: a website is only
 * accepted after we fetch it and see this company's phone number — or its name
 * and city — on the page. Emails are never taken from the model at all; they
 * are scraped from the verified site by the normal enrichment path.
 */

import { generateGroundedText } from "./ai";
import { fetchHtml, htmlToText, hostOf } from "./web";
import type { DiscoveredCompany } from "./types";

export type Socials = {
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
};

export type OnlinePresence = {
  /** Verified official website, or null. */
  website: string | null;
  socials: Socials;
};

const NONE: OnlinePresence = { website: null, socials: {} };

/** Hosts that are a profile or directory listing, not the company's own site. */
const NOT_A_WEBSITE = [
  "facebook.com", "fb.com", "instagram.com", "linkedin.com", "twitter.com", "x.com",
  "youtube.com", "tiktok.com", "olx.com.pk", "yellowpages.com.pk", "pakbiz.com",
  "google.com", "goo.gl", "wa.me", "whatsapp.com", "justdial.com", "alibaba.com",
  "pakistanbusinessdirectory.com", "mapquest.com", "foursquare.com",
];

const GENERIC_NAME_WORDS = new Set([
  "the", "and", "co", "company", "corp", "corporation", "ltd", "limited", "pvt", "private",
  "llc", "inc", "trading", "traders", "trader", "enterprises", "enterprise", "brothers", "bros",
  "associates", "group", "industries", "international", "imports", "exports", "suppliers", "store",
]);

function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

function isSocialHost(host: string, name: string) {
  return host === name || host.endsWith(`.${name}`);
}

function distinctiveTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !GENERIC_NAME_WORDS.has(w))
    .slice(0, 3);
}

/** The page must show this company's number, or its distinctive name plus its city. */
export function pageMatchesCompany(
  pageText: string,
  company: Pick<DiscoveredCompany, "name" | "city" | "phone">,
): boolean {
  const lower = pageText.toLowerCase();

  const phoneDigits = (company.phone || "").replace(/\D/g, "");
  if (phoneDigits.length >= 8) {
    const tail = phoneDigits.slice(-8);
    if (lower.replace(/\D/g, "").includes(tail)) return true;
  }

  const tokens = distinctiveTokens(company.name);
  if (!tokens.length) return false;
  const nameOk = tokens.every((t) => lower.includes(t));
  const cityOk = Boolean(company.city) && lower.includes(String(company.city).toLowerCase());
  return nameOk && cityOk;
}

export async function findOnlinePresence(
  company: Pick<DiscoveredCompany, "name" | "city" | "country" | "address" | "phone">,
): Promise<OnlinePresence> {
  if (!process.env.GEMINI_API_KEY) return NONE;

  const prompt = `Find the official online presence of this business by searching the web.

Business: ${company.name}
City: ${company.city || "unknown"}
Country: ${company.country || "unknown"}
Address: ${company.address || "unknown"}
Phone: ${company.phone || "unknown"}

Rules:
- Only return a page that clearly belongs to THIS business (same city, address or phone). Do not return a similarly named business elsewhere.
- "website" must be the business's own site. A Facebook, Instagram, LinkedIn, OLX or directory page is NOT a website.
- If you are not sure, use null. Never invent a URL.

Reply with ONLY this JSON, no prose, no markdown fence:
{ "website": "https://..." or null, "facebook": "https://..." or null, "instagram": "https://..." or null, "linkedin": "https://..." or null }`;

  let parsed: Record<string, unknown>;
  try {
    const raw = await generateGroundedText(prompt, 400);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NONE;
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  } catch (error) {
    // Typically a 429 (grounding quota on a free-tier key). Not fatal: the
    // company simply stays a phone / WhatsApp lead.
    console.warn("[prospecting/presence] lookup failed:", error instanceof Error ? error.message.slice(0, 160) : error);
    return NONE;
  }

  const socials: Socials = {};
  for (const key of ["facebook", "instagram", "linkedin"] as const) {
    const url = cleanUrl(parsed[key]);
    const host = hostOf(url);
    if (url && host && isSocialHost(host, `${key}.com`)) socials[key] = url;
  }

  const candidate = cleanUrl(parsed.website);
  const host = hostOf(candidate);
  if (!candidate || !host || NOT_A_WEBSITE.some((d) => isSocialHost(host, d))) {
    return { website: null, socials };
  }

  const html = await fetchHtml(candidate);
  if (!html || !pageMatchesCompany(htmlToText(html), company)) {
    return { website: null, socials };
  }

  return { website: candidate, socials };
}
