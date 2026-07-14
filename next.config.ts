import type { NextConfig } from "next";

// NOTE: Content-Security-Policy is set per-request from proxy.ts (the middleware)
// so that we can include a fresh nonce on every response. All other security
// headers remain static and live here.
const SECURITY_HEADERS = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevent MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // XSS protection (legacy browsers)
  { key: "X-XSS-Protection", value: "1; mode=block" },
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
  experimental: {},
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
        permanent: false,
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
