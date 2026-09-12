/**
 * Meta (Facebook) Pixel.
 *
 * Advertising, not analytics: it exists so Meta can tell which ad click turned
 * into a demo, and learn to find more people like that person. So it loads
 * behind the *marketing* consent flag, not the analytics one — see
 * lib/cookieConsent.ts and the loader in
 * app/(marketing)/landing/components/AnalyticsLoader.tsx, which is also where
 * Clarity is gated.
 *
 * Nothing here runs on the server, and nothing runs before consent.
 */

// A Pixel ID is public — it is visible in the page source of every site that
// runs one — so it lives in code rather than an environment variable that has
// to be mirrored into Vercel to work. The env var still wins if it is set, for
// staging or a second pixel.
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_FB_PIXEL_ID || "2157908214792765";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string };
    _fbq?: unknown;
  }
}

let injected = false;

/**
 * Meta's own snippet, rewritten so it can be called from a React effect
 * instead of pasted into <head>. Same behaviour: define the fbq queue first so
 * calls made before the script lands are replayed, then load fbevents.js.
 *
 * The script element carries no nonce and does not need one: the CSP uses
 * 'strict-dynamic', so a script injected by our own already-trusted bundle is
 * trusted too. connect.facebook.net and www.facebook.com are named in the CSP
 * anyway (see proxy.ts) for browsers that ignore strict-dynamic.
 */
export function loadMetaPixel(pixelId = META_PIXEL_ID) {
  if (typeof window === "undefined" || injected || !pixelId) return;
  injected = true;

  const fbq: Window["fbq"] = function (...args: unknown[]) {
    if (fbq!.callMethod) fbq!.callMethod(...args);
    else fbq!.queue!.push(args);
  } as NonNullable<Window["fbq"]>;

  window.fbq = window.fbq || fbq;
  window._fbq = window._fbq || window.fbq;
  window.fbq!.queue = window.fbq!.queue || [];
  window.fbq!.loaded = true;
  window.fbq!.version = "2.0";

  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

/**
 * A standard Meta event. Silently does nothing when the pixel never loaded —
 * which is the normal case for a visitor who declined marketing cookies, and
 * must not throw in the middle of whatever the visitor was actually doing.
 */
export function trackMetaEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", event, params);
}

/** Someone started a demo — the conversion the ads are being optimised for. */
export function trackLead(params?: Record<string, unknown>) {
  trackMetaEvent("Lead", params);
}
