import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keeps `next build` stable on small PCs/Vercel preview builders instead of spawning too many workers.
    cpus: 1,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
