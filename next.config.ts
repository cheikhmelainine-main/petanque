import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, // Ignore les erreurs ESLint pendant le build
  },
  typescript: {
    ignoreBuildErrors: true, // Ignore les erreurs TypeScript pendant le build
  },
};

export default nextConfig;
