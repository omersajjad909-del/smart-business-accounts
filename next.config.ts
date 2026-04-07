import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["bcryptjs"],
  serverExternalPackages: [],
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
