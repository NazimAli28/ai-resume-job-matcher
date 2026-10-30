import { readCentralDirectory, readEntry } from "../files/zip";
import type { Extraction, Line } from "../types";
import { garbledCount, summarize } from "./common";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENTITIES[e] ?? m),
  );

interface Para {
  text: string;
  hiddenText: string;
  bold: boolean;
  anyText: boolean;
  allBold: boolean;
  size?: number;
  listItem: boolean;
  inTable: boolean;
  inTextbox: boolean;
}

/**
 * Walk WordprocessingML in document order. Paragraphs nested in text boxes are emitted where
 * they appear, which is roughly what a simple parser does.
 */
function parseParagraphs(xml: string): { paras: Para[]; drawings: number } {
  const tag = /<(\/?)([a-zA-Z0-9]+:[a-zA-Z0-9]+)([^>]*?)(\/?)>|([^<]+)/g;
  const stack: Para[] = [];
  const paras: Para[] = [];
  let tbl = 0;
  let txbx = 0;
  let inT = false;
  let inRPr = false;
  let runBold = false;
  let runHidden = false;
  let drawings = 0;
  const attr = (a: string, name: string) => a.match(new RegExp(`${name}="([^"]*)"`))?.[1];

  for (let m = tag.exec(xml); m; m = tag.exec(xml)) {
    const [, close, name, attrs, selfClose, txt] = m;
    if (txt !== undefined) {
      if (inT && stack.length) {
        const p = stack[stack.length - 1];
        const t = decode(txt);
        if (runHidden) p.hiddenText += t;
        else {
          p.text += t;
          p.anyText = true;
          if (!runBold && t.trim()) p.allBold = false;
        }
      }
      continue;
    }
    const open = !close;
    switch (name) {
      case "w:p":
        if (open && !selfClose) stack.push({ text: "", hiddenText: "", bold: false, anyText: false, allBold: true, listItem: false, inTable: tbl > 0, inTextbox: txbx > 0 });
        else if (close) {
          const p = stack.pop();
          if (p) paras.push({ ...p, bold: p.anyText && p.allBold });
        }
        break;
      case "w:tbl":
        tbl += open ? 1 : -1;
        break;
      case "w:txbxContent":
        txbx += open ? 1 : -1;
        break;
      case "w:drawing":
      case "w:pict":
        if (open) drawings++;
        break;
      case "w:r":
        if (open) {
          runBold = false;
          runHidden = false;
        }
        break;
      case "w:rPr":
        inRPr = open && !selfClose;
        break;
      case "w:b":
        if (inRPr && open) runBold = !/w:val="(0|false)"/.test(attrs);
        break;
      case "w:vanish":
        if (inRPr && open) runHidden = !/w:val="(0|false)"/.test(attrs);
        break;
      case "w:color":
        if (inRPr && open && /^(FFFFFF|FEFEFE)$/i.test(attr(attrs, "w:val") ?? "")) runHidden = true;
        break;
      case "w:sz":
        if (open && stack.length) {
          const v = Number(attr(attrs, "w:val"));
          if (v && v < 8) runHidden = true; // under 4 pt
          if (v && !stack[stack.length - 1].size) stack[stack.length - 1].size = v / 2;
        }
        break;
      case "w:numPr":
        if (open && stack.length) stack[stack.length - 1].listItem = true;
        break;
      case "w:t":
        inT = open && !selfClose;
        break;
      case "w:tab":
        if (stack.length && open) stack[stack.length - 1].text += "\t";
        break;
      case "w:br":
        if (stack.length && open) stack[stack.length - 1].text += " ";
        break;
    }
  }
  return { paras, drawings };
}

function textOf(xml: string) {
  return parseParagraphs(xml)
    .paras.map((p) => p.text.trim())
    .filter(Boolean);
}

export function extractDocx(buf: Buffer): Extraction {
  const entries = readCentralDirectory(buf);
  const read = (name: string) => {
    const e = entries.get(name);
    return e ? readEntry(buf, e).toString("utf8") : "";
  };
  const { paras, drawings } = parseParagraphs(read("word/document.xml"));

  const headerLines = [...entries.keys()].filter((n) => /^word\/header\d*\.xml$/.test(n)).flatMap((n) => textOf(read(n)));
  const footerLines = [...entries.keys()].filter((n) => /^word\/footer\d*\.xml$/.test(n)).flatMap((n) => textOf(read(n)));

  const pages = Number(read("docProps/app.xml").match(/<Pages>(\d+)<\/Pages>/)?.[1]) || 0;

  const body: Line[] = paras
    .filter((p) => p.text.trim())
    .map((p) => ({
      text: p.text.replace(/\s+/g, " ").trim(),
      page: 1,
      band: "body" as const,
      bold: p.bold,
      fontSize: p.size,
      listItem: p.listItem,
      inTable: p.inTable,
      inTextbox: p.inTextbox,
    }));
  const lines: Line[] = [
    ...headerLines.map((text) => ({ text, page: 1, band: "header" as const })),
    ...body,
    ...footerLines.map((text) => ({ text, page: 1, band: "footer" as const })),
  ];

  const bodyChars = body.reduce((s, l) => s + l.text.length, 0) || 1;
  const share = (pred: (l: Line) => boolean) => body.filter(pred).reduce((s, l) => s + l.text.length, 0) / bodyChars;
  const pageCount = pages || Math.max(1, Math.ceil(bodyChars / 3500));
  const per = Math.round(bodyChars / pageCount);

  return summarize({
    kind: "DOCX",
    pageCount,
    lines,
    charsPerPage: Array.from({ length: pageCount }, () => per),
    features: {
      headerFooterText: [...headerLines, ...footerLines].join("\n"),
      tableTextShare: share((l) => Boolean(l.inTable)),
      textboxTextShare: share((l) => Boolean(l.inTextbox)),
      columnPages: [],
      images: drawings,
      hiddenText: paras.map((p) => p.hiddenText.trim()).filter(Boolean),
      garbledCount: garbledCount(body.map((l) => l.text).join("\n")),
    },
  });
}
