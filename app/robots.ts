// FILE: app/robots.ts
import { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

/** Private surfaces. Applied to every crawler, including the AI ones. */
const PRIVATE_PATHS = [
  // "/admin" is deliberately absent. The console is not served on this domain
  // at all — it 404s here — so listing it would only point at something that
  // is meant to be unadvertised. See ADMIN_HOST in proxy.ts.
  "/dashboard",
  "/dashboard/",
  "/api/",
  "/onboarding/",
  "/auth/",
  "/login",
  "/signup",
  "/website-login",
  "/website-signup",
  "/login-email",
  "/sso",
  "/chat-admin",
  "/status",
];

/**
 * AI answer-engine crawlers, allowed deliberately.
 *
 * Two distinct jobs are being done by these agents, and it is worth knowing
 * which is which before changing anything here:
 *
 *   SEARCH / RETRIEVAL — build the index an assistant cites from, or fetch a
 *   page live in response to a user's question. Blocking these makes the site
 *   uncitable in ChatGPT Search, Perplexity, Claude and similar. There is no
 *   upside to blocking them for a product that wants to be discovered.
 *     OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User,
 *     PerplexityBot, Perplexity-User
 *
 *   TRAINING CORPUS — gather content for model training. Allowing these does
 *   not directly place the site in answers, but it is how a product name comes
 *   to be known by a model at all. This is a business call, not a technical
 *   one: revert these three to disallow if the position on training use
 *   changes, and leave the search agents above alone.
 *     GPTBot, Google-Extended, Applebot-Extended
 *
 * Note that Googlebot already covers Google AI Overviews and bingbot covers
 * Copilot, so neither needs an entry here — the wildcard rule handles both.
 */
const AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "Amazonbot",
  "Bytespider",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      ...AI_CRAWLERS.map(userAgent => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
