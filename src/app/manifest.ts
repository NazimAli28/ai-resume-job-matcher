import type { MetadataRoute } from "next";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT_NAME,
    short_name: "Job Matcher",
    description: `${PRODUCT_NAME}: ${PRODUCT_TAGLINE}`,
    start_url: "/app",
    display: "standalone",
    background_color: "#101215",
    theme_color: "#101215",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
