import type { NextConfig } from "next";

// Static export to GitHub Pages.
// See docs/08-decisions.md (D-019) for the rationale.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/weeding-planner",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
