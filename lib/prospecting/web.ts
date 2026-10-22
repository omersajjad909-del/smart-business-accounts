/**
 * Small fetch + HTML helpers shared by enrichment and the online-presence
 * finder. Kept in their own module so those two can depend on it without
 * importing each other.
 */

const FETCH_TIMEOUT_MS = 12_000;

/**
 * Raw HTML is capped high on purpose. Emails and phone numbers live in the
 * footer, and a real business site is easily 300KB of markup — cutting it at
 * 60KB meant the footer was never read and "emails found" stayed at 0.
 */
const MAX_FETCH_CHARS = 1_500_000;

export async function fetchHtml(url: string): Promise<string | null> {
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
    return (await res.text()).slice(0, MAX_FETCH_CHARS);
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

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}
