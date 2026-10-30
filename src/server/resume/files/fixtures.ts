import { crc32, deflateRawSync } from "node:zlib";

/** Test-only builders for small DOCX/ZIP and PDF files. Synthetic content only. */

export function zip(files: Record<string, string | Buffer>, opts: { encryptFlag?: boolean; lieAboutSize?: number } = {}): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    const comp = deflateRawSync(data);
    const nameBuf = Buffer.from(name, "utf8");
    const size = opts.lieAboutSize ?? data.length;
    const flags = opts.encryptFlag ? 1 : 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, comp);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const para = (text: string, o: { bold?: boolean; list?: boolean; hidden?: boolean } = {}) =>
  `<w:p>${o.list ? "<w:pPr><w:numPr><w:ilvl w:val=\"0\"/></w:numPr></w:pPr>" : ""}<w:r><w:rPr>${o.bold ? "<w:b/>" : ""}${o.hidden ? '<w:color w:val="FFFFFF"/>' : ""}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;

export function docx(bodyXml: string, extra: Record<string, string> = {}): Buffer {
  return zip({
    "[Content_Types].xml": "<Types/>",
    "word/document.xml": `<?xml version="1.0"?><w:document ${W}><w:body>${bodyXml}</w:body></w:document>`,
    "docProps/app.xml": "<Properties><Pages>1</Pages></Properties>",
    ...extra,
  });
}

/** Minimal one-page PDF with Helvetica text lines at given y (points from the bottom, page 612x792). */
export function pdf(lines: { text: string; y: number; x?: number; size?: number }[]): Buffer {
  const content = lines
    .map((l) => `BT /F1 ${l.size ?? 11} Tf ${l.x ?? 72} ${l.y} Td (${l.text.replace(/[()\\]/g, "\\$&")}) Tj ET`)
    .join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
