import { getDocumentProxy } from "unpdf";
import { RejectError, UPLOAD_LIMITS } from "../files/sniff";
import type { Extraction, Line } from "../types";
import { garbledCount, summarize } from "./common";

interface Item {
  str: string;
  x: number;
  y: number; // from the bottom (PDF space)
  w: number;
  size: number;
}

const BAND = 0.06; // top/bottom 6% of the page = header/footer band (rule P2)

/** Group text items into visual lines in raster order (top→bottom, left→right), like a naive parser. */
function toLines(items: Item[], pageNo: number, width: number, height: number): Line[] {
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Item[][] = [];
  for (const it of sorted) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - it.y) <= Math.max(2, row[0].size * 0.45)) row.push(it);
    else rows.push([it]);
  }
  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    let text = "";
    let lastEnd = -Infinity;
    for (const it of row) {
      const gap = it.x - lastEnd;
      text += (text && gap > it.size * 0.25 ? " " : "") + it.str;
      lastEnd = it.x + it.w;
    }
    const top = 1 - row[0].y / height;
    const band = top < BAND ? "header" : top > 1 - BAND ? "footer" : "body";
    return {
      text: text.replace(/\s+/g, " ").trim(),
      page: pageNo,
      top,
      left: row[0].x / width,
      fontSize: Math.round(Math.max(...row.map((i) => i.size)) * 10) / 10,
      band,
    } satisfies Line;
  });
}

/**
 * Two columns: two clusters of line starts (one near the left margin, one past 40% of the width),
 * each holding ≥ 20% of lines, with overlapping vertical ranges.
 */
function hasColumns(items: Item[], width: number): boolean {
  const starts = items.filter((i) => i.str.trim().length > 2);
  if (starts.length < 12) return false;
  const left = starts.filter((i) => i.x / width < 0.35);
  const right = starts.filter((i) => i.x / width >= 0.4);
  if (left.length < starts.length * 0.2 || right.length < starts.length * 0.2) return false;
  const span = (xs: Item[]) => [Math.min(...xs.map((i) => i.y)), Math.max(...xs.map((i) => i.y))];
  const [l0, l1] = span(left);
  const [r0, r1] = span(right);
  const overlap = Math.min(l1, r1) - Math.max(l0, r0);
  return overlap > 0.3 * Math.min(l1 - l0, r1 - r0);
}

export async function extractPdf(buf: Buffer): Promise<Extraction> {
  let doc;
  try {
    doc = await getDocumentProxy(new Uint8Array(buf));
  } catch (err) {
    if (err instanceof Error && /password/i.test(err.name + err.message)) throw new RejectError("ENCRYPTED");
    throw new RejectError("CORRUPT");
  }
  try {
    if (doc.numPages > UPLOAD_LIMITS.maxPages) throw new RejectError("TOO_MANY_PAGES");
    const lines: Line[] = [];
    const charsPerPage: number[] = [];
    const columnPages: number[] = [];
    const hidden: string[] = [];

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: Item[] = [];
      for (const raw of content.items) {
        if (!("str" in raw)) continue;
        const t = raw.transform as number[];
        const size = Math.hypot(t[2], t[3]) || Math.abs(t[3]) || 10;
        if (size < 4 && raw.str.trim()) hidden.push(raw.str.trim());
        items.push({ str: raw.str, x: t[4], y: t[5], w: raw.width, size });
      }
      const pageLines = toLines(items, p, vp.width, vp.height);
      lines.push(...pageLines);
      charsPerPage.push(pageLines.reduce((s, l) => s + l.text.length, 0));
      if (hasColumns(items, vp.width)) columnPages.push(p);
      page.cleanup();
    }

    const bodyText = lines.filter((l) => l.band === "body").map((l) => l.text).join("\n");
    return summarize({
      kind: "PDF",
      pageCount: doc.numPages,
      lines,
      charsPerPage,
      features: {
        headerFooterText: lines.filter((l) => l.band !== "body").map((l) => l.text).join("\n"),
        tableTextShare: 0, // ruled-grid detection is not implemented for PDF yet
        textboxTextShare: 0,
        columnPages,
        images: 0, // image XObject counting is not implemented for PDF yet
        hiddenText: hidden,
        garbledCount: garbledCount(bodyText),
      },
    });
  } finally {
    await doc.cleanup();
  }
}
