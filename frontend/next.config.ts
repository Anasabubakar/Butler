import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Prevent Next from picking a parent monorepo lockfile (e.g. ~/package-lock.json)
  // which corrupts tracing and can break .next vendor-chunks in dev.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
