import "server-only";
import { unstable_cache } from "next/cache";
import { DEFAULT_ACCENT } from "@/config/brand";
import type { Accent } from "@/components/theme/use-theme";
import { db } from "../db";

export const ACCENT_TAG = "default-accent";
const ACCENTS: Accent[] = ["lime", "mint", "cyan", "magenta"];

/**
 * The accent new visitors see. Cached so public pages stay static; saving a new one clears the cache.
 * With no database (a CI build) or on any failure it falls back to the brand default.
 */
export const defaultAccent = unstable_cache(
  async (): Promise<Accent> => {
    try {
      const row = await db.appSetting.findUnique({ where: { key: "default_accent" } });
      return ACCENTS.includes(row?.value as Accent) ? (row?.value as Accent) : DEFAULT_ACCENT;
    } catch {
      return DEFAULT_ACCENT;
    }
  },
  ["default-accent"],
  { tags: [ACCENT_TAG], revalidate: 3600 },
);
