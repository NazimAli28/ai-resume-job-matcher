import { db } from "@/server/db";
import { captureError } from "@/server/observability/errors";

export const dynamic = "force-dynamic";

/** Is the app able to reach its database? Says only yes or no; details go to the error log. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    await captureError(e, { source: "ROUTE", route: "/api/health" });
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
