import type { Extraction, Line } from "./types";

/**
 * Test helper: build Line[] from a multi-line string. Prefix a line with "[h]" or "[f]" for header/footer
 * band, "[b]" for bold, "[t]" for table. A blank line is skipped.
 */
export function linesFrom(text: string, page = 1): Line[] {
  const out: Line[] = [];
  for (const raw of text.split("\n")) {
    let t = raw.trim();
    if (!t) continue;
    const line: Line = { text: "", page, band: "body" };
    for (;;) {
      const m = /^\[(h|f|b|t)\]\s*/.exec(t);
      if (!m) break;
      t = t.slice(m[0].length);
      if (m[1] === "h") line.band = "header";
      if (m[1] === "f") line.band = "footer";
      if (m[1] === "b") line.bold = true;
      if (m[1] === "t") line.inTable = true;
    }
    line.text = t;
    out.push(line);
  }
  return out;
}

export function makeExtraction(lines: Line[], over: Partial<Extraction> = {}): Extraction {
  const chars = lines.reduce((a, l) => a + l.text.length, 0);
  return {
    kind: "PDF",
    pageCount: 1,
    lines,
    atsText: lines.map((l) => l.text).join("\n"),
    charsPerPage: [chars],
    features: { headerFooterText: "", tableTextShare: 0, textboxTextShare: 0, columnPages: [], images: 0, hiddenText: [], garbledCount: 0 },
    ...over,
  };
}

export const CLEAN_RESUME = `
Ayesha Khan
Lead Software Engineer
Lahore, Pakistan | ayesha.khan@example.com | +92 300 1234567 | linkedin.com/in/ayeshakhan
Summary
Backend engineer with 6 years of experience building payment and logistics platforms.
Experience
Senior Software Engineer | Acme Technologies | Jan 2022 – Present
• Led a team of 5 engineers to rebuild the billing service, cutting invoice errors by 35%.
• Designed REST APIs serving 2 million requests per day with 99.9% uptime.
• Mentored junior developers and ran weekly code reviews.
Software Engineer
Beta Solutions Pvt Ltd, Lahore
Mar 2019 - Dec 2021
- Developed a delivery tracking module used by 120 clients.
- Reduced deployment time from 40 minutes to 8 minutes by automating the pipeline.
- Migrated the reporting database to PostgreSQL, saving PKR 1.2M annually.
Education
BS Computer Science — FAST NUCES Lahore
2015 – 2019
CGPA: 3.4/4.0
Skills
Python, TypeScript, PostgreSQL | Docker, AWS (EC2, S3) • Git
`;
