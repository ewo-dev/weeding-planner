import type { NextConfig } from "next";

// Static export to Vercel (docs/08-decisions.md D-024).
// No basePath: the app is served from the Vercel domain root.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
