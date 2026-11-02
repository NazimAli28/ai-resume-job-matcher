import { getDocumentProxy } from "unpdf";
import { findDateRange } from "../dates";
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
const PAGE_NUMBER_RE = /^(?:page\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?$/i;

const isSpace = (i: Item) => !i.str.trim();

/** Group text items into visual rows in raster order (top→bottom, left→right), like a naive parser. */
function toRows(items: Item[]): Item[][] {
  const sorted = items.filter((i) => i.str).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Item[][] = [];
  for (const it of sorted) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - it.y) <= Math.max(2, row[0].size * 0.45)) row.push(it);
    else rows.push([it]);
  }
  for (const row of rows) row.sort((a, b) => a.x - b.x);
  return rows.filter((row) => row.some((i) => !isSpace(i)));
}

/**
 * Text in the top/bottom 6% only counts as a running header/footer when it stands apart from the
 * body. A full page can run its last section right down to the margin.
 */
function assignBands(lines: Line[], height: number) {
  const tops = lines.map((l) => l.top ?? 0);
  const gaps = tops.slice(1).map((t, i) => (t - tops[i]) * height).sort((a, b) => a - b);
  const apart = 2.5 * (gaps[Math.floor(gaps.length / 2)] ?? 0);
  const gapAfter = (i: number) => (i + 1 < lines.length ? (tops[i + 1] - tops[i]) * height : Infinity);
  const lastHeader = tops.findLastIndex((t) => t < BAND);
  const firstFooter = tops.findIndex((t) => t > 1 - BAND);
  lines.forEach((l, i) => {
    if (lastHeader >= 0 && i <= lastHeader && gapAfter(lastHeader) > apart) l.band = "header";
    if (firstFooter >= 0 && i >= firstFooter && (firstFooter === 0 || gapAfter(firstFooter - 1) > apart || PAGE_NUMBER_RE.test(l.text))) l.band = "footer";
  });
}

function toLines(rows: Item[][], pageNo: number, width: number, height: number): Line[] {
  const lines = rows.map((row) => {
    const words = row.filter((i) => !isSpace(i));
    let text = "";
    let lastEnd = -Infinity;
    let pendingSpace = false;
    for (const it of row) {
      if (isSpace(it)) {
        pendingSpace = true; // PDF writers often emit the space as its own item
        continue;
      }
      text += (text && (pendingSpace || it.x - lastEnd > it.size * 0.15) ? " " : "") + it.str;
      lastEnd = it.x + it.w;
      pendingSpace = false;
    }
    return {
      text: text.replace(/\s+/g, " ").trim(),
      page: pageNo,
      top: 1 - words[0].y / height,
      left: words[0].x / width,
      right: lastEnd / width,
      fontSize: Math.round(Math.max(...words.map((i) => i.size)) * 10) / 10,
      band: "body",
    } satisfies Line as Line;
  });
  assignBands(lines, height);
  return lines;
}

/**
 * Two columns: many rows share one vertical edge past 25% of the width, either starting there or
 * holding text on both sides of a wide gap. Right-aligned dates and locations don't count.
 */
function hasColumns(rows: Item[][], width: number): boolean {
  const edges: number[] = [];
  for (const row of rows) {
    const words = row.filter((i) => !isSpace(i));
    if (words[0].x / width >= 0.25 && words.length > 0 && words.map((w) => w.str).join(" ").length >= 12) {
      edges.push(words[0].x / width);
      continue;
    }
    let lastEnd = -Infinity;
    for (let i = 0; i < words.length; i++) {
      if (lastEnd > -Infinity && (words[i].x - lastEnd) / width >= 0.04) {
        const right = words.slice(i).map((w) => w.str).join(" ");
        if (right.length >= 12 && !findDateRange(right)) edges.push(words[i].x / width);
        break;
      }
      lastEnd = words[i].x + words[i].w;
    }
  }
  const needed = Math.max(6, rows.length * 0.25);
  return edges.some((e) => e >= 0.25 && edges.filter((o) => Math.abs(o - e) <= 0.015).length >= needed);
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
        // Tiny words are hidden text. Tiny bullet dots are just how some PDF writers draw lists.
        if (size < 4 && /\p{L}{2}/u.test(raw.str)) hidden.push(raw.str.trim());
        items.push({ str: raw.str, x: t[4], y: t[5], w: raw.width, size });
      }
      const rows = toRows(items);
      const pageLines = toLines(rows, p, vp.width, vp.height);
      lines.push(...pageLines);
      charsPerPage.push(pageLines.reduce((s, l) => s + l.text.length, 0));
      if (hasColumns(rows, vp.width)) columnPages.push(p);
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
