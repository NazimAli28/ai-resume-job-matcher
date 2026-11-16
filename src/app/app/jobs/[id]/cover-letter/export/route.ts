import { redirect } from "next/navigation";
import { placeholdersIn } from "@/server/ai/guard/facts";
import { requireUser } from "@/server/auth/user";
import { letterParagraphs } from "@/server/cover-letter/core";
import { getLetter } from "@/server/cover-letter/service";
import { db } from "@/server/db";
import { contactLine, letterBlocks } from "@/server/export/blocks";
import { renderDocx } from "@/server/export/docx";
import { renderPdf } from "@/server/export/pdf";
import { captureError } from "@/server/observability/errors";
import { rateLimit } from "@/server/ratelimit";
import { CNIC_RE } from "@/server/resume/patterns";
import type { ResumeDoc } from "@/server/resume/types";

export const dynamic = "force-dynamic";

/** The letter as PDF or Word, with the resume's contact block (CVL-006). Blocked while placeholders remain (CVL-009). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const format = new URL(req.url).searchParams.get("format") === "docx" ? "docx" : "pdf";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const letter = await getLetter(user.id, id);
  if (!letter) return new Response("Not found", { status: 404 });
  if (!(await rateLimit(`letter:export:${user.id}`, 60, 3600)).ok) return new Response("You've downloaded many files in a short time. Please wait a little.", { status: 429 });
  if (placeholdersIn(letter.text).length) redirect(`/app/jobs/${id}/cover-letter?export=placeholders`);

  const [job, version] = await Promise.all([
    db.job.findFirst({ where: { id, userId: user.id }, select: { company: true } }),
    letter.resumeVersionId ? db.resumeVersion.findFirst({ where: { id: letter.resumeVersionId, userId: user.id }, select: { content: true } }) : null,
  ]);
  const doc = version?.content as unknown as ResumeDoc | undefined;
  // The contact block follows the resume's own privacy rules: never a CNIC.
  const contact = doc ? contactLine(doc).replace(new RegExp(CNIC_RE.source, "g"), "").trim() : "";
  try {
    const blocks = letterBlocks({
      name: doc?.basics.name,
      contact,
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi" }),
      recipient: letter.recipient ?? undefined,
      company: job?.company ?? undefined,
      paragraphs: letterParagraphs(letter.text),
    });
    const meta = { title: "Cover letter", author: doc?.basics.name };
    const body = format === "pdf" ? renderPdf(blocks, meta) : await renderDocx(blocks, meta);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="cover-letter.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    await captureError(e, { source: "ROUTE", route: "/app/jobs/[id]/cover-letter/export", userId: user.id });
    return new Response("We couldn't build that file. Please try again.", { status: 500 });
  }
}
