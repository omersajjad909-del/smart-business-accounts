import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["bcryptjs"],
  serverExternalPackages: [],
};

export default nextConfig;
