import { describe, expect, it } from "vitest";
import { docx, para, pdf, zip } from "../files/fixtures";
import { RejectError, sniff } from "../files/sniff";
import { extract } from "./index";

const RESUME = [
  para("Ayesha Khan"),
  para("ayesha.khan@example.com | 0300-1234567 | Lahore"),
  para("EXPERIENCE", { bold: true }),
  para("Frontend Developer, Kinara Software · Feb 2023 – Present"),
  para("Built 14 React screens used by 300+ dispatchers", { list: true }),
  para("Cut page load time by 40% by code-splitting routes", { list: true }),
  para("EDUCATION", { bold: true }),
  para("BS Computer Science, FAST NUCES, 2018 – 2022, CGPA 3.4/4.0"),
  para("SKILLS", { bold: true }),
  para("React, TypeScript, Next.js, REST APIs, Git, Jest, Tailwind CSS, Figma"),
  para("I am a hard-working team player who loves building fast, accessible interfaces for real users every day."),
].join("");

const rejectReason = async (p: Promise<unknown>) => {
  try {
    await p;
    return "none";
  } catch (e) {
    return e instanceof RejectError ? e.reason : `other:${String(e)}`;
  }
};

describe("file intake (sniff)", () => {
  it("detects types from bytes, not names", () => {
    expect(sniff(docx(RESUME))).toBe("DOCX");
    expect(sniff(pdf([{ text: "Hello", y: 700 }]))).toBe("PDF");
  });

  it("rejects disguised, empty, oversized and legacy files", async () => {
    expect(await rejectReason((async () => sniff(Buffer.from("MZ\x90\x00 not a resume")))())).toBe("WRONG_TYPE");
    expect(await rejectReason((async () => sniff(Buffer.alloc(0)))())).toBe("EMPTY");
    expect(await rejectReason((async () => sniff(Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(5 * 1024 * 1024)])))())).toBe("TOO_LARGE");
    expect(await rejectReason((async () => sniff(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0])))())).toBe("ENCRYPTED");
    expect(await rejectReason((async () => sniff(zip({ "hello.txt": "a zip that is not a docx" })))())).toBe("WRONG_TYPE");
  });

  it("rejects macros, encrypted zips and zip bombs", async () => {
    expect(await rejectReason((async () => sniff(docx(RESUME, { "word/vbaProject.bin": "x" })))())).toBe("MACROS");
    expect(await rejectReason((async () => sniff(zip({ "word/document.xml": "<x/>" }, { encryptFlag: true })))())).toBe("ENCRYPTED");
    expect(await rejectReason((async () => sniff(zip({ "word/document.xml": "a".repeat(5000) }, { lieAboutSize: 400 * 1024 * 1024 })))())).toBe("ZIP_BOMB");
  });

  it("rejects encrypted PDFs", async () => {
    const enc = Buffer.concat([pdf([{ text: "x", y: 700 }]), Buffer.from("trailer << /Encrypt 9 0 R >>\n")]);
    expect(await rejectReason((async () => sniff(enc))())).toBe("ENCRYPTED");
  });
});

describe("DOCX extraction", () => {
  it("reads paragraphs in order with list and bold flags", async () => {
    const e = await extract(docx(RESUME));
    const body = e.lines.filter((l) => l.band === "body");
    expect(body[0].text).toBe("Ayesha Khan");
    expect(body.find((l) => l.text === "EXPERIENCE")?.bold).toBe(true);
    expect(body.filter((l) => l.listItem)).toHaveLength(2);
    expect(e.atsText).toContain("Cut page load time by 40%");
  });

  it("separates header text and finds hidden and table text", async () => {
    const header = `<w:hdr xmlns:w="x">${para("Ayesha Khan · ayesha.khan@example.com")}</w:hdr>`;
    const body = RESUME + para("keywords keywords keywords", { hidden: true }) + `<w:tbl><w:tr><w:tc>${para("Skills inside a table cell with lots of words here")}</w:tc></w:tr></w:tbl>`;
    const e = await extract(docx(body, { "word/header1.xml": header }));
    expect(e.features.headerFooterText).toContain("ayesha.khan@example.com");
    expect(e.lines[0].band).toBe("header");
    expect(e.features.hiddenText.join(" ")).toContain("keywords");
    expect(e.features.tableTextShare).toBeGreaterThan(0);
  });

  it("decodes XML entities", async () => {
    const e = await extract(docx(RESUME + para("R&D <lead> at \"Acme\" for many many years in a row")));
    expect(e.atsText).toContain('R&D <lead> at "Acme"');
  });
});

describe("PDF extraction", () => {
  const lines = [
    { text: "Ayesha Khan", y: 740, size: 18 },
    { text: "ayesha.khan@example.com  0300-1234567  Lahore", y: 720 },
    { text: "EXPERIENCE", y: 690, size: 13 },
    { text: "Frontend Developer, Kinara Software, Feb 2023 - Present", y: 670 },
    { text: "- Built 14 React screens used by 300+ dispatchers across Pakistan", y: 655 },
    { text: "- Cut page load time by 40% by code-splitting the main routes", y: 640 },
    { text: "EDUCATION", y: 610, size: 13 },
    { text: "BS Computer Science, FAST NUCES, 2018 - 2022, CGPA 3.4/4.0", y: 590 },
    { text: "SKILLS", y: 560, size: 13 },
    { text: "React, TypeScript, Next.js, REST APIs, Git, Jest, Tailwind CSS, Figma", y: 540 },
    { text: "Page 1 of 1", y: 20, size: 8 },
  ];

  it("reads lines top to bottom with bands and font sizes", async () => {
    const e = await extract(pdf(lines));
    expect(e.kind).toBe("PDF");
    expect(e.pageCount).toBe(1);
    const body = e.lines.filter((l) => l.band === "body");
    expect(body[0].text).toBe("Ayesha Khan");
    expect(body[0].fontSize).toBeGreaterThan(15);
    expect(e.lines.at(-1)?.band).toBe("footer");
    expect(e.atsText.indexOf("EXPERIENCE")).toBeLessThan(e.atsText.indexOf("EDUCATION"));
  });

  it("flags two-column layouts", async () => {
    const two = Array.from({ length: 10 }, (_, i) => [
      { text: `Left column line number ${i} with text`, y: 700 - i * 20, x: 50 },
      { text: `Right column line number ${i} with text`, y: 700 - i * 20, x: 330 },
    ]).flat();
    const e = await extract(pdf(two));
    expect(e.features.columnPages).toEqual([1]);
  });

  it("refuses image-only files", async () => {
    expect(await rejectReason(extract(pdf([{ text: "x", y: 700 }])))).toBe("IMAGE_ONLY");
  });
});
