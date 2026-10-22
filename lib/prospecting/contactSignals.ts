/**
 * Pulling contact details out of raw HTML.
 *
 * Runs on the *whole* page, not the text the model reads: an address in a
 * footer, a mailto: link, or one hidden by Cloudflare's email protection never
 * survives htmlToText, but all three are how small businesses publish them.
 */

export type EmailCandidate = {
  email: string;
  /** Came from a mailto: link, Cloudflare-protected markup, or a contact page —
   * i.e. the site itself is offering it as a way to reach the business. */
  explicit: boolean;
};

export type ContactSignals = {
  emails: EmailCandidate[];
  /** Digits only, from tel: links. */
  phones: string[];
  /** Digits only, from wa.me / api.whatsapp.com links. */
  whatsapp: string[];
};

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;

/** Addresses that are never a decision maker and only dilute the score. */
const ROLE_PREFIXES = [
  "noreply", "no-reply", "donotreply", "postmaster", "abuse", "webmaster",
  "privacy", "legal", "unsubscribe", "mailer-daemon",
];

const PLACEHOLDER_LOCALS = new Set([
  "example", "email", "name", "yourname", "your-email", "youremail", "user", "username", "test", "mail", "someone",
]);

/** Third-party addresses that ride along in page source: tracking, platforms, templates. */
const NOISE_DOMAINS = [
  "sentry.io", "sentry-next.wixpress.com", "wixpress.com", "example.com", "domain.com",
  "yourdomain.com", "email.com", "schema.org", "w3.org", "wordpress.org", "wordpress.com",
  "gravatar.com", "google.com", "googleapis.com", "gstatic.com", "facebook.com", "cloudflare.com",
  "elementor.com", "envato.com", "themeforest.net", "godaddy.com",
];

export const FREE_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "ymail.com", "hotmail.com",
  "outlook.com", "live.com", "msn.com", "icloud.com", "aol.com", "proton.me", "protonmail.com",
]);

/** Cloudflare "email protection": the first hex byte is the XOR key for the rest. */
export function decodeCfEmail(hex: string): string | null {
  if (hex.length < 4 || hex.length % 2 !== 0) return null;
  try {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    }
    return out.includes("@") ? out : null;
  } catch {
    return null;
  }
}

function normaliseEntities(html: string): string {
  return html
    .replace(/&#0*64;|&#x0*40;|&commat;/gi, "@")
    .replace(/&#0*46;|&#x0*2e;|&period;/gi, ".")
    .replace(/\s?[[(]\s?at\s?[\])]\s?/gi, "@")
    .replace(/\s?[[(]\s?dot\s?[\])]\s?/gi, ".");
}

function isUsable(email: string): boolean {
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (/\.(png|jpe?g|gif|svg|webp|css|js|woff2?|ico|avif)$/.test(email)) return false;
  if (ROLE_PREFIXES.some((p) => local.startsWith(p))) return false;
  if (PLACEHOLDER_LOCALS.has(local)) return false;
  if (NOISE_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return false;
  return true;
}

/**
 * @param explicitPage  true when this HTML came from a contact-style page, where
 *   any address shown is the business offering itself as reachable.
 */
export function extractContactSignals(html: string, explicitPage: boolean): ContactSignals {
  const emails = new Map<string, boolean>();
  const add = (raw: string, explicit: boolean) => {
    const email = raw.trim().toLowerCase().replace(/^mailto:/, "").replace(/[.,;:>)\]]+$/, "");
    if (!isUsable(email)) return;
    emails.set(email, (emails.get(email) || false) || explicit);
  };

  // Cloudflare-protected addresses.
  for (const m of html.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) {
    const decoded = decodeCfEmail(m[1]);
    if (decoded) add(decoded, true);
  }
  for (const m of html.matchAll(/\/cdn-cgi\/l\/email-protection#([0-9a-f]+)/gi)) {
    const decoded = decodeCfEmail(m[1]);
    if (decoded) add(decoded, true);
  }

  // mailto: links.
  for (const m of html.matchAll(/mailto:([^"'\s<>?]+)/gi)) {
    try {
      add(decodeURIComponent(m[1]), true);
    } catch {
      add(m[1], true);
    }
  }

  // Anything that merely looks like an address in the markup or visible text.
  for (const match of normaliseEntities(html).match(EMAIL_RE) || []) add(match, explicitPage);

  const phones = new Set<string>();
  for (const m of html.matchAll(/href="tel:([^"]+)"/gi)) {
    const digits = decodeURIComponent(m[1]).replace(/\D/g, "");
    if (digits.length >= 7) phones.add(digits);
  }

  const whatsapp = new Set<string>();
  for (const m of html.matchAll(/wa\.me\/(\d{7,15})/gi)) whatsapp.add(m[1]);
  for (const m of html.matchAll(/(?:api|web)\.whatsapp\.com\/send\/?\?[^"'\s]*?phone=(\d{7,15})/gi)) whatsapp.add(m[1]);

  return {
    emails: [...emails.entries()].map(([email, explicit]) => ({ email, explicit })),
    phones: [...phones],
    whatsapp: [...whatsapp],
  };
}

/**
 * Decides which scraped addresses are worth keeping, best first:
 *   1. on the company's own domain
 *   2. offered explicitly by the site (mailto / protected / contact page) on any
 *      other domain — small firms often publish a sibling domain, or a
 *      gmail/yahoo address, as their real inbox
 *   3. a free-mail address found anywhere on their own pages
 * Everything else on a page (a web designer's address, a template leftover) is
 * dropped.
 */
export function rankEmails(candidates: EmailCandidate[], siteDomain: string | null): string[] {
  const isOwn = (email: string) => {
    const d = email.split("@")[1];
    return Boolean(siteDomain) && (d === siteDomain || d.endsWith(`.${siteDomain}`));
  };
  const isFree = (email: string) => FREE_MAIL_DOMAINS.has(email.split("@")[1]);

  const tier = (c: EmailCandidate): number => {
    if (isOwn(c.email)) return 0;
    if (c.explicit && !isFree(c.email)) return 1;
    if (isFree(c.email)) return 2;
    return 99;
  };

  return candidates
    .map((c) => ({ c, t: tier(c) }))
    .filter((x) => x.t < 99)
    .sort((a, b) => a.t - b.t)
    .map((x) => x.c.email)
    .filter((email, index, all) => all.indexOf(email) === index)
    .slice(0, 5);
}

/** Same-site links that look like a contact or about page. */
export function discoverContactLinks(html: string, root: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/href="([^"#]+)"/gi)) {
    const href = m[1].trim();
    if (!/contact|get-in-touch|reach-us|about/i.test(href)) continue;
    if (/\.(png|jpe?g|gif|svg|pdf|css|js)(\?|$)/i.test(href)) continue;
    if (/wp-json|oembed|xmlrpc|\/feed|\?/i.test(href)) continue;
    let path: string | null = null;
    if (href.startsWith("/")) path = href;
    else if (href.startsWith(root)) path = href.slice(root.length) || "/";
    if (path && path !== "/" && !out.includes(path)) out.push(path);
    if (out.length >= 3) break;
  }
  return out;
}
