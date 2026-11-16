import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/user";
import { db } from "@/server/db";
import { resumeBlocks } from "@/server/export/blocks";
import { renderDocx } from "@/server/export/docx";
import { renderPdf } from "@/server/export/pdf";
import { captureError } from "@/server/observability/errors";
import { rateLimit } from "@/server/ratelimit";
import { CNIC_RE } from "@/server/resume/patterns";
import type { ResumeDoc } from "@/server/resume/types";

export const dynamic = "force-dynamic";

const fileName = (s: string) => s.replace(/[^\p{L}\p{N} _-]+/gu, "").trim().replace(/\s+/g, "-").slice(0, 60) || "resume";

/** Any version as a clean, single-column PDF or Word file (TLR-015). Blocked while a CNIC number is on it (TLR-016). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const format = new URL(req.url).searchParams.get("format") === "docx" ? "docx" : "pdf";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const v = await db.resumeVersion.findFirst({ where: { id, userId: user.id, deletedAt: null }, select: { id: true, name: true, content: true } });
  if (!v) return new Response("Not found", { status: 404 });
  if (!(await rateLimit(`resume:export:${user.id}`, 60, 3600)).ok) return new Response("You've downloaded many files in a short time. Please wait a little.", { status: 429 });

  const doc = v.content as unknown as ResumeDoc;
  if (new RegExp(CNIC_RE.source).test(JSON.stringify(doc))) redirect(`/app/resumes/${v.id}?export=cnic`);

  try {
    const meta = { title: `${doc.basics.name ?? "Resume"} - Resume`, author: doc.basics.name };
    const blocks = resumeBlocks(doc);
    const body = format === "pdf" ? renderPdf(blocks, meta) : await renderDocx(blocks, meta);
    const name = `${fileName(doc.basics.name ?? v.name)}-resume.${format}`;
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    await captureError(e, { source: "ROUTE", route: "/app/resumes/[id]/export", userId: user.id });
    return new Response("We couldn't build that file. Please try again.", { status: 500 });
  }
}
