/**
 * Stage 2 — turning a name and an address into something worth scoring.
 *
 * Two sources, in order of trust:
 *   1. The company's own website. Free, always current, and it is where the
 *      warehouse count and the "we have 4 branches" claim actually live.
 *   2. A contact provider (Hunter / Apollo) for a named decision maker and a
 *      deliverable address.
 *
 * The model reads the scraped text and pulls out facts. That is a safe use of
 * an LLM — it is extracting from a document we fetched, not inventing from
 * memory — but every number it returns is still bounds-checked below.
 */

import { generateProspectingText } from "./ai";
import { SOFTWARE_GAP_SIGNALS, ENTRENCHED_SOFTWARE } from "./icp";
import { bandForEmployees } from "./types";
import type { DiscoveredCompany, EnrichmentResult } from "./types";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_CHARS = 60_000;
const MAX_TEXT_CHARS = 9_000;

const EMPTY: EnrichmentResult = {
  employeeCount: null,
  employeeBand: null,
  warehouseCount: null,
  locationCount: null,
  branches: [],
  revenueBand: null,
  currentSoftware: null,
  contacts: [],
  notes: null,
  raw: {},
};

/** Pages most likely to carry staff counts, branch lists and contact details. */
const CANDIDATE_PATHS = ["", "/about", "/about-us", "/contact", "/contact-us"];

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Identify ourselves honestly; some hosts block unlabelled clients.
        "User-Agent": "FinovaOS-Prospecting/1.0 (+https://finovaos.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.includes("html") && !type.includes("text")) return null;
    return (await res.text()).slice(0, MAX_HTML_CHARS);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Crude but dependency-free HTML to text. Good enough for an LLM to read. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/** Addresses that are never a decision maker and only dilute the score. */
const ROLE_PREFIXES = [
  "noreply", "no-reply", "donotreply", "postmaster", "abuse", "webmaster",
  "privacy", "legal", "unsubscribe", "mailer-daemon",
];

function harvestEmails(text: string, domain: string | null): string[] {
  const found = new Set<string>();
  for (const match of text.match(EMAIL_RE) || []) {
    const email = match.toLowerCase();
    const local = email.split("@")[0];
    if (ROLE_PREFIXES.some((p) => local.startsWith(p))) continue;
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(email)) continue;
    // Only trust an address on the company's own domain; anything else on the
    // page is usually their web designer or a stock-photo licence.
    if (domain && !email.endsWith(`@${domain}`)) continue;
    found.add(email);
  }
  return [...found].slice(0, 5);
}

function detectSoftware(text: string): string | null {
  const lower = text.toLowerCase();
  for (const name of ENTRENCHED_SOFTWARE) {
    if (lower.includes(name)) return name;
  }
  for (const signal of SOFTWARE_GAP_SIGNALS) {
    if (lower.includes(signal)) return signal;
  }
  return null;
}

function clampCount(value: unknown, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(Math.round(n), max);
}

type ExtractedFacts = {
  employeeCount?: unknown;
  warehouseCount?: unknown;
  locationCount?: unknown;
  branches?: unknown;
  revenueBand?: unknown;
  currentSoftware?: unknown;
  contactName?: unknown;
  contactTitle?: unknown;
  notes?: unknown;
};

/** Asks the model to extract only what the page actually states. */
async function extractFacts(company: DiscoveredCompany, text: string): Promise<ExtractedFacts> {
  const prompt = `Below is the text of ${company.name}'s own website. Extract only facts the text actually states or clearly implies. Never guess a number that is not supported by the text — return null instead.

WEBSITE TEXT:
"""
${text.slice(0, MAX_TEXT_CHARS)}
"""

Return ONLY this JSON object, no prose, no markdown fence:
{
  "employeeCount": number or null,
  "warehouseCount": number or null,
  "locationCount": number or null,
  "branches": [{ "name": "string", "address": "string or null", "type": "hq" | "warehouse" | "branch" | "outlet" }],
  "revenueBand": "string like '$1M-$5M' or null",
  "currentSoftware": "name of any accounting/ERP/inventory software mentioned, or null",
  "contactName": "owner, CEO or director name if stated, else null",
  "contactTitle": "their job title if stated, else null",
  "notes": "two sentences on what this business does and what operational pain is visible from their own words"
}`;

  try {
    const raw = await generateProspectingText(prompt, 1200);
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? (JSON.parse(match[0]) as ExtractedFacts) : {};
  } catch {
    return {};
  }
}

// ─── Contact provider ─────────────────────────────────────────────────────────

type HunterEmail = {
  value?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  confidence?: number;
  type?: string;
};

/** Hunter domain-search: the cheapest way to a named, deliverable contact. */
async function findContactsViaHunter(domain: string) {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=5&api_key=${key}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { emails?: HunterEmail[] } };
    return (data.data?.emails || [])
      // Personal addresses convert; info@ and sales@ go to a shared inbox.
      .filter((e) => e.value && (e.confidence ?? 0) >= 70)
      .map((e) => ({
        name: [e.first_name, e.last_name].filter(Boolean).join(" ") || null,
        title: e.position || null,
        email: String(e.value).toLowerCase(),
        phone: null,
        linkedin: null,
      }));
  } catch {
    return [];
  }
}

/**
 * Checks an address is actually deliverable before we spend reputation on it.
 * Returns "unverified" when no verification key is configured, and the sender
 * treats that as "hold" rather than "send".
 */
export async function verifyEmail(email: string): Promise<string> {
  const key = process.env.ZEROBOUNCE_API_KEY;
  if (!key) return "unverified";
  try {
    const res = await fetch(
      `https://api.zerobounce.net/v2/validate?api_key=${key}&email=${encodeURIComponent(email)}`,
    );
    if (!res.ok) return "unverified";
    const data = (await res.json()) as { status?: string };
    const status = String(data.status || "").toLowerCase();
    if (status === "valid") return "valid";
    if (status === "catch-all") return "catch_all";
    if (status === "invalid" || status === "spamtrap" || status === "abuse") return "invalid";
    return "risky";
  } catch {
    return "unverified";
  }
}

/**
 * Enriches one discovered company.
 *
 * Safe to call on a `.invalid` sample row — the fetches simply fail and the
 * function returns a synthetic profile so the rest of the pipeline still has
 * something to work with.
 */
export async function enrichCompany(company: DiscoveredCompany): Promise<EnrichmentResult> {
  // Sample rows have no real website; give the pipeline plausible shape data
  // rather than a page of nulls, and mark it so nobody mistakes it for fact.
  if (company.source === "sample") {
    const seed = Number((company.raw?.seed as number) ?? 0);
    const employees = 8 + ((seed * 13) % 180);
    return {
      ...EMPTY,
      employeeCount: employees,
      employeeBand: bandForEmployees(employees),
      warehouseCount: (seed % 4) + 1,
      locationCount: (seed % 3) + 1,
      branches: [{ name: `${company.city} Head Office`, address: company.address, type: "hq" }],
      currentSoftware: seed % 3 === 0 ? "excel" : null,
      contacts: [
        {
          name: "Sample Contact",
          title: "Managing Director",
          email: `owner@${company.domain}`,
          phone: null,
          linkedin: null,
        },
      ],
      notes: "Placeholder profile generated because no discovery API is configured.",
      raw: { sample: true },
    };
  }

  const base = company.website || (company.domain ? `https://${company.domain}` : null);
  if (!base) return { ...EMPTY, notes: "No website found — nothing to enrich from." };

  const pages: string[] = [];
  for (const path of CANDIDATE_PATHS) {
    const html = await fetchText(`${base.replace(/\/$/, "")}${path}`);
    if (html) pages.push(htmlToText(html));
    if (pages.join(" ").length > MAX_TEXT_CHARS) break;
  }

  if (!pages.length) {
    return { ...EMPTY, notes: "Website unreachable — scored on directory data only." };
  }

  const text = pages.join("\n\n").slice(0, MAX_TEXT_CHARS);
  const facts = await extractFacts(company, text);

  const scrapedEmails = harvestEmails(text, company.domain);
  const hunterContacts = company.domain ? await findContactsViaHunter(company.domain) : [];

  // Prefer a named contact from the provider; fall back to whatever the site
  // published. Deduplicate on the address itself.
  const byEmail = new Map<string, EnrichmentResult["contacts"][number]>();
  for (const contact of hunterContacts) byEmail.set(contact.email, contact);
  for (const email of scrapedEmails) {
    if (byEmail.has(email)) continue;
    byEmail.set(email, {
      name: facts.contactName ? String(facts.contactName) : null,
      title: facts.contactTitle ? String(facts.contactTitle) : null,
      email,
      phone: company.phone,
      linkedin: null,
    });
  }

  const employeeCount = clampCount(facts.employeeCount, 500_000);
  const branches = Array.isArray(facts.branches)
    ? (facts.branches as Array<Record<string, unknown>>).slice(0, 25).map((b) => ({
        name: String(b.name || "Branch"),
        address: b.address ? String(b.address) : null,
        type: ["hq", "warehouse", "branch", "outlet"].includes(String(b.type))
          ? String(b.type)
          : "branch",
      }))
    : [];

  return {
    employeeCount,
    employeeBand: bandForEmployees(employeeCount),
    warehouseCount:
      clampCount(facts.warehouseCount, 500) ??
      (branches.filter((b) => b.type === "warehouse").length || null),
    locationCount: clampCount(facts.locationCount, 500) ?? (branches.length || null),
    branches,
    revenueBand: facts.revenueBand ? String(facts.revenueBand).slice(0, 40) : null,
    currentSoftware: facts.currentSoftware
      ? String(facts.currentSoftware).slice(0, 60).toLowerCase()
      : detectSoftware(text),
    contacts: [...byEmail.values()].slice(0, 5),
    notes: facts.notes ? String(facts.notes).slice(0, 800) : null,
    raw: { pagesFetched: pages.length, textLength: text.length },
  };
}
