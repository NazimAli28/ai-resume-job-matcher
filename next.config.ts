import type { NextConfig } from "next";

// Baseline security headers on every response. A full script-src CSP with nonces lands in
// Phase 8 (it needs the proxy and makes pages dynamic); these directives are safe today.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://yeseefoftucoksxnfcln.supabase.co https://accounts.google.com; object-src 'none'" },
];

// cacheComponents/partialPrefetching (scaffold defaults) are off for the demo
// prototype: every app screen is client-rendered from a local demo store.
const nextConfig: NextConfig = {
  poweredByHeader: false,
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
