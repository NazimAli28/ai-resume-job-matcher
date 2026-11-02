import { CNIC_RE, EMAIL_RE, IBAN_PK_RE, PK_MOBILE_RE } from "../resume/patterns";

/** Rule 8.3 phrase list. A hit doesn't block anything: the text stays data and the user gets a notice. */
const INJECTION_RE =
  /ignore (?:all|any|previous|the above|above)[\w ]{0,20}instructions|disregard (?:all|previous|the above)|you are now|rate this (?:candidate|resume)|give (?:me|this candidate) (?:100|10\/10)|(?:^|\n)\s*(?:assistant|system)\s*:/i;
/** Zero-width and bidi control characters hide text from people but not from models. */
const INVISIBLE_RE = /[​-‏⁠﻿‪-‮⁦-⁩]/g;

export function scanInjection(text: string): boolean {
  return INJECTION_RE.test(text) || text.search(INVISIBLE_RE) >= 0;
}

export function stripInvisible(text: string): string {
  return text.replace(INVISIBLE_RE, "");
}

/** Mask personal data before anything leaves for the AI provider (05 §8.4). Nothing is rehydrated for job posts. */
export function maskPii(text: string): string {
  return text
    .replace(CNIC_RE, "{{PII_REMOVED_ID}}")
    .replace(IBAN_PK_RE, "{{PII_REMOVED_ID}}")
    .replace(EMAIL_RE, "{{PII_EMAIL}}")
    .replace(PK_MOBILE_RE, "{{PII_PHONE}}");
}

/** Wrap untrusted text; closing tags inside it are escaped so it can't break out of the wrapper. */
export function wrapUntrusted(tag: string, text: string): string {
  return `<untrusted_${tag}>\n${text.replace(/<\/untrusted_/gi, "&lt;/untrusted_")}\n</untrusted_${tag}>`;
}

const norm = (s: string) =>
  s.normalize("NFKC").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();

/** A quote must appear in the source (05 §7.3). Anything the model made up fails this. */
export function verifyQuote(quote: string, source: string): boolean {
  const q = norm(quote);
  return q.length > 0 && norm(source).includes(q);
}
