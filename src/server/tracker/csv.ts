/** Quotes a value and neutralizes spreadsheet formulas, since notes and company names are free text. */
export function cell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** CRLF, with a BOM so Excel reads non-English names correctly. */
export const toCsv = (rows: (string | number | null | undefined)[][]) => `﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}`;
