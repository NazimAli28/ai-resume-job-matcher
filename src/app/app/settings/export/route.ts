import { redirect } from "next/navigation";
import { audit } from "@/server/audit";
import { isRecentlySignedIn, requireUser } from "@/server/auth/user";
import { clientIp, ipPrefix } from "@/server/http/request";
import { captureError } from "@/server/observability/errors";
import { exportEntries } from "@/server/privacy/export";
import { zipChunks } from "@/server/privacy/zip";
import { rateLimit } from "@/server/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The user's whole account as a ZIP (SET-010). Open to a blocked account: they can still take their data. */
export async function GET() {
  const user = await requireUser({ allowBlocked: true, allowMissingConsent: true });
  if (!(await isRecentlySignedIn())) redirect("/app/settings?confirm=export");
  if (!(await rateLimit(`privacy:export:${user.id}`, 3, 86_400)).ok) return new Response("You've downloaded your data several times today. Please try again tomorrow.", { status: 429 });
  await audit("DATA_EXPORTED", { subjectUserId: user.id, ipPrefix: ipPrefix(await clientIp()) });

  const chunks = zipChunks(exportEntries(user.id));
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await chunks.next();
        if (done) controller.close();
        else controller.enqueue(new Uint8Array(value));
      } catch (e) {
        await captureError(e, { source: "ROUTE", route: "/app/settings/export", userId: user.id });
        controller.error(new Error("export failed"));
      }
    },
    async cancel() {
      await chunks.return(undefined);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="my-data.zip"',
      "Cache-Control": "no-store",
    },
  });
}
