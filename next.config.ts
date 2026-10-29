import type { NextConfig } from "next";

// cacheComponents/partialPrefetching (scaffold defaults) are off for the demo
// prototype: every app screen is client-rendered from a local demo store.
const nextConfig: NextConfig = {
  // Keep the dev badge off the sidebar.
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
