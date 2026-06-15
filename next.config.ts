import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// unsafe-eval removed in production — only kept in dev for Next.js HMR/fast-refresh
const SCRIPT_SRC = process.env.NODE_ENV === "production"
  ? "'self' 'unsafe-inline' https://fonts.googleapis.com https://www.googletagmanager.com https://static.cloudflareinsights.com"
  : "'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://www.googletagmanager.com https://static.cloudflareinsights.com";

const CSP = [
  "default-src 'self'",
  `script-src ${SCRIPT_SRC}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://ipapi.co https://www.googletagmanager.com https://static.cloudflareinsights.com https://cloudflareinsights.com",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

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
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" },
  // Content Security Policy
  { key: "Content-Security-Policy", value: CSP },
  // Prevent cross-origin info leakage
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  compress: true,
  poweredByHeader: false,
  transpilePackages: ["bcryptjs"],
  serverExternalPackages: ["@prisma/client"],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: [
      "recharts",
      "lucide-react",
      "react-hot-toast",
      "date-fns",
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
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
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "finovaos",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
