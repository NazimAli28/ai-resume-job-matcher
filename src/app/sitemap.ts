import type { MetadataRoute } from "next";

const PUBLIC_PATHS = ["", "/demo", "/login", "/signup", "/legal/terms", "/legal/privacy", "/legal/ai", "/legal/acceptable-use", "/legal/cookies"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return PUBLIC_PATHS.map((path) => ({ url: `${base}${path}` }));
}
