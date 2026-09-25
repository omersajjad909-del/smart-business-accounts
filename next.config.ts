import type { NextConfig } from "next";

// NOTE: Content-Security-Policy is set per-request from proxy.ts (the middleware)
// so that we can include a fresh nonce on every response. All other security
// headers remain static and live here.
const SECURITY_HEADERS = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevent MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // X-XSS-Protection deliberately omitted: modern browsers removed their XSS
  // auditors (the header does nothing in current Chrome/Firefox/Safari), and
  // the strict per-request CSP set in proxy.ts is what actually mitigates XSS
  // here. Keeping a dead header around just adds noise to security scans.
  // HSTS — force HTTPS for 1 year, include subdomains
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Referrer policy — only send origin on same-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions policy — disable unused browser APIs
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" },
  // Prevent cross-origin info leakage
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  transpilePackages: ["bcryptjs"],
  serverExternalPackages: ["@prisma/client"],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Auto tree-shakes barrel-file imports (e.g. `import { X } from "lucide-react"`)
    // into per-module imports at build time, so pages only ship the specific
    // icons/chart pieces they actually use instead of the whole package graph.
    optimizePackageImports: ["lucide-react", "recharts"],

    /* The Vercel build container is 8 GB, and the build was being killed by the
       kernel rather than failing on its own — the signature of a process that
       grew past what the box had. Two settings keep it inside:

       webpackMemoryOptimizations trades a little compile time for a smaller
       peak heap, which is the trade worth making on a box this size.

       memoryBasedWorkersCount decides how many compile workers to spawn from
       the memory actually available instead of from the core count. Two cores
       meant two workers, each free to grow to whatever the heap cap allowed,
       and two of those did not fit in 8 GB at once. */
    webpackMemoryOptimizations: true,
    memoryBasedWorkersCount: true,
  },
  async redirects() {
    return [
      {
        source: "/:path((?!api|_next|favicon|robots|sitemap|images|icons|fonts).*)*",
        has: [{ type: "host", value: "finovaos.app" }],
        destination: "https://www.finovaos.app/:path*",
        permanent: true,
      },
      {
        source: "/forge",
        destination: "/forge/home",
        // 301, not 302. A temporary redirect leaves /forge indexable in its own
        // right, so Google kept it clustered against /forge/home as a duplicate.
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
      // Private paths: block indexing via header (belt-and-suspenders with robots.txt)
      {
        source: "/(auth|admin|dashboard|onboarding)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      // Transactional document viewers and account-setup screens. These return
      // 200 with no canonical, and the three /view/* pages render the same
      // empty shell when opened without their query params — which is the
      // "Duplicate without user-selected canonical" cluster Search Console
      // flagged. None of them are search destinations.
      //
      // Header-only on purpose, with no matching robots.txt Disallow: a
      // disallowed URL is never fetched, so Google would never see the noindex
      // and the already-indexed duplicates would sit there indefinitely.
      // Crawlable + noindex is what actually gets them dropped.
      {
        source: "/(view|business-setup|billing)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        // Cache static assets for 1 year
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Cache public images/fonts for 7 days
        source: "/(.*)\\.(ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf)",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      // OG/Twitter preview images must be fetchable by external crawlers (LinkedIn, WhatsApp, Slack, opengraph.xyz)
      {
        source: "/opengraph-image",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/twitter-image",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/icon",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/apple-icon",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
