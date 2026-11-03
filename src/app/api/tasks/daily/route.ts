import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { runDaily } from "@/server/tasks/daily";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(header: string | null) {
  const secret = env().CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Vercel Cron sends the CRON_SECRET as a bearer token. Everyone else gets a plain 404. */
export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) return new Response("Not found", { status: 404 });
  return Response.json(await runDaily(), { headers: { "Cache-Control": "no-store" } });
}
