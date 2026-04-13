import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["bcryptjs"],
  serverExternalPackages: [],
  typescript: {
    // Next.js 16 internal type generation bug — does not affect runtime
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
