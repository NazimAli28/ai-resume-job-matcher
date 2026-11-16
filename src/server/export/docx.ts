import { zipChunks } from "../privacy/zip";
import type { Block } from "./blocks";

/** A plain Word file: real paragraphs, built-in heading style, no tables or text boxes. */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const run = (text: string, opts: { bold?: boolean; size?: number } = {}) =>
  `<w:r><w:rPr>${opts.bold ? "<w:b/>" : ""}${opts.size ? `<w:sz w:val="${opts.size}"/>` : ""}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

function paragraph(b: Block): string {
  switch (b.kind) {
    case "gap":
      return `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`;
    case "name":
      return `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>${run(b.text, { bold: true, size: 36 })}</w:p>`;
    case "contact":
    case "meta":
      return `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>${run(b.text, { size: 19 })}</w:p>`;
    case "heading":
      return `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>${run(b.text.toUpperCase())}</w:p>`;
    case "title":
      return `<w:p><w:pPr><w:spacing w:before="60" w:after="20"/></w:pPr>${run(b.text, { bold: true, size: 21 })}</w:p>`;
    case "bullet":
      return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:after="20"/></w:pPr>${run(b.text)}</w:p>`;
    case "para":
      return `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr>${run(b.text)}</w:p>`;
  }
}

const NS = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${NS}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="21"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="60"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="808080"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="23"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360" w:hanging="220"/></w:pPr></w:style>
</w:styles>`;

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ${NS}>
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="220"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

export async function renderDocx(blocks: Block[], meta: { title: string; author?: string }): Promise<Buffer> {
  const body = blocks.map(paragraph).join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NS}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const files = [
    {
      name: "[Content_Types].xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    },
    {
      name: "word/_rels/document.xml.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`,
    },
    { name: "word/document.xml", text: document },
    { name: "word/styles.xml", text: STYLES },
    { name: "word/numbering.xml", text: NUMBERING },
    {
      name: "docProps/core.xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(meta.title)}</dc:title>${meta.author ? `<dc:creator>${esc(meta.author)}</dc:creator>` : ""}</cp:coreProperties>`,
    },
  ];
  const chunks: Buffer[] = [];
  for await (const c of zipChunks(files.map((f) => ({ name: f.name, data: Buffer.from(f.text, "utf8") })))) chunks.push(c);
  return Buffer.concat(chunks);
}
