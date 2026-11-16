import type { Block } from "./blocks";

/**
 * A plain PDF writer: one column of real text in the standard Helvetica fonts (every PDF reader has
 * them, so nothing is embedded and nothing can be read in the wrong order). No dependency.
 */

const A4 = { w: 595, h: 842 };
const MARGIN = 54;
const WIDTH = A4.w - MARGIN * 2;

// Helvetica advance widths (Adobe AFM), ASCII 32-126, in 1/1000 em.
const W = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584,
  584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667,
  611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500,
  722, 500, 500, 500, 334, 260, 334, 584,
];

// Characters outside ASCII that WinAnsi can show. Anything else becomes "?" rather than garbage.
const WIN_ANSI: Record<string, number> = { "•": 0x95, "–": 0x96, "—": 0x97, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "…": 0x85, "€": 0x80, "·": 0xb7, "é": 0xe9, "è": 0xe8, "ü": 0xfc, "ö": 0xf6, "ä": 0xe4, "ç": 0xe7, "ñ": 0xf1, "£": 0xa3 };

function encode(text: string): number[] {
  const out: number[] = [];
  for (const ch of text.normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    if (c >= 32 && c <= 126) out.push(c);
    else if (WIN_ANSI[ch]) out.push(WIN_ANSI[ch]);
    else if (/\s/.test(ch)) out.push(32);
    else out.push(63);
  }
  return out;
}

const charWidth = (code: number) => (code >= 32 && code <= 126 ? W[code - 32] : code === 0x95 ? 350 : code === 0x97 ? 1000 : 556);

export function textWidth(text: string, size: number, bold = false): number {
  const w = encode(text).reduce((s, c) => s + charWidth(c), 0);
  return (w * size * (bold ? 1.07 : 1)) / 1000; // bold runs a little wider; the margin absorbs the rest
}

export function wrap(text: string, size: number, maxWidth: number, bold = false): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (!line || textWidth(next, size, bold) <= maxWidth) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

const hex = (text: string) => `<${encode(text).map((c) => c.toString(16).padStart(2, "0")).join("")}>`;

const STYLE: Record<Exclude<Block["kind"], "gap">, { size: number; bold: boolean; before: number; lead: number }> = {
  name: { size: 18, bold: true, before: 0, lead: 22 },
  contact: { size: 9.5, bold: false, before: 2, lead: 12 },
  heading: { size: 11, bold: true, before: 12, lead: 15 },
  title: { size: 10.5, bold: true, before: 2, lead: 13 },
  meta: { size: 9.5, bold: false, before: 0, lead: 12 },
  bullet: { size: 10, bold: false, before: 1, lead: 12.5 },
  para: { size: 10, bold: false, before: 1, lead: 12.5 },
};

export function renderPdf(blocks: Block[], meta: { title: string; author?: string }): Buffer {
  const pages: string[][] = [[]];
  let y = A4.h - MARGIN;
  const ops = () => pages[pages.length - 1];
  const need = (h: number) => {
    if (y - h < MARGIN) {
      pages.push([]);
      y = A4.h - MARGIN;
    }
  };

  for (const b of blocks) {
    if (b.kind === "gap") {
      y -= 6;
      continue;
    }
    const s = STYLE[b.kind];
    const font = s.bold ? "/F2" : "/F1";
    const indent = b.kind === "bullet" ? 14 : 0;
    const text = b.kind === "heading" ? b.text.toUpperCase() : b.text;
    const lines = wrap(text, s.size, WIDTH - indent, s.bold);
    need(s.before + s.lead * Math.min(lines.length, 2) + (b.kind === "heading" ? 20 : 0)); // keep a heading with what follows
    y -= s.before;
    lines.forEach((line, i) => {
      need(s.lead);
      y -= s.lead;
      if (b.kind === "bullet" && i === 0) ops().push(`BT /F1 ${s.size} Tf ${MARGIN + 3} ${y.toFixed(2)} Td ${hex("•")} Tj ET`);
      ops().push(`BT ${font} ${s.size} Tf ${MARGIN + indent} ${y.toFixed(2)} Td ${hex(line)} Tj ET`);
    });
    if (b.kind === "heading") ops().push(`0.6 w ${MARGIN} ${(y - 3).toFixed(2)} m ${A4.w - MARGIN} ${(y - 3).toFixed(2)} l S`);
  }

  const objs: string[] = [];
  const add = (o: string) => objs.push(o) && objs.length;
  const catalog = add("");
  const pagesId = add("");
  const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids: number[] = [];
  for (const p of pages) {
    const content = p.join("\n");
    const c = add(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Contents ${c} 0 R /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  const info = add(`<< /Title ${hex(meta.title)} ${meta.author ? `/Author ${hex(meta.author)} ` : ""}/Producer ${hex("AI Resume Job Matcher")} >>`);

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
