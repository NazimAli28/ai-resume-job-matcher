import { RejectError, sniff, UPLOAD_LIMITS } from "../files/sniff";
import type { Extraction } from "../types";
import { extractDocx } from "./docx";
import { extractPdf } from "./pdf";

/** Validate by content, then extract. Throws RejectError with a user-facing reason. */
export async function extract(buf: Buffer): Promise<Extraction> {
  const kind = sniff(buf);
  const out = kind === "PDF" ? await extractPdf(buf) : extractDocx(buf);
  if (out.pageCount > UPLOAD_LIMITS.maxPages) throw new RejectError("TOO_MANY_PAGES");
  // Image-only: under 200 characters on every page that should hold content (rule P1).
  if (out.charsPerPage.every((c) => c < 200) && out.lines.filter((l) => l.band === "body").length < 5) {
    throw new RejectError("IMAGE_ONLY");
  }
  return out;
}
