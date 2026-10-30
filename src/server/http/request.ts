import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { env } from "../env";

/** Client IP from Vercel's forwarded header. Only used hashed or truncated, never stored raw. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "0.0.0.0").trim();
}

/** "203.0.113.0/24" or the first 3 IPv6 groups: enough for abuse review, not identifying. */
export function ipPrefix(ip: string): string {
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":") + "::/48";
  const p = ip.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.${p[2]}.0/24` : "unknown";
}

/** Keyed hash for identifiers in logs and rate-limit keys (HMAC with a server pepper). */
export function pepperHash(value: string): string {
  const e = env();
  if (!e.HASH_PEPPER && e.NODE_ENV === "production") throw new Error("HASH_PEPPER is not set");
  const pepper = e.HASH_PEPPER ?? "dev-pepper-not-secret";
  return createHmac("sha256", pepper).update(value.toLowerCase()).digest("hex").slice(0, 32);
}
