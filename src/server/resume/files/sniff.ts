import { readCentralDirectory, ZipError } from "./zip";

export const UPLOAD_LIMITS = { maxBytes: 5 * 1024 * 1024, warnBytes: 2.5 * 1024 * 1024, maxPages: 6 } as const;

export type FileKind = "PDF" | "DOCX";
export type RejectReason =
  | "TOO_LARGE"
  | "EMPTY"
  | "WRONG_TYPE"
  | "ENCRYPTED"
  | "MACROS"
  | "ZIP_BOMB"
  | "CORRUPT"
  | "TOO_MANY_PAGES"
  | "IMAGE_ONLY";

export const REJECT_MESSAGE: Record<RejectReason, string> = {
  TOO_LARGE: "That file is over 5 MB. Export a smaller PDF or Word file and try again.",
  EMPTY: "That file is empty.",
  WRONG_TYPE: "Only PDF and Word (.docx) files are supported. Older .doc files: open in Word and save as .docx.",
  ENCRYPTED: "That file is password-protected. Remove the password and upload it again.",
  MACROS: "That Word file contains macros, which we don't accept. Save it as a normal .docx (Word Document).",
  ZIP_BOMB: "We couldn't safely open that file. Please re-save it from Word or Google Docs and try again.",
  CORRUPT: "That file looks damaged. Please re-save or re-export it and try again.",
  TOO_MANY_PAGES: "Resumes up to 6 pages are supported. Please shorten it and try again.",
  IMAGE_ONLY: "This file is an image, so most hiring systems would read no text from it. Export a text PDF or upload a Word file.",
};

export class RejectError extends Error {
  constructor(public reason: RejectReason) {
    super(reason);
  }
}

/** Decide the real type from the bytes, never the name or the browser's claim. */
export function sniff(buf: Buffer): FileKind {
  if (buf.length === 0) throw new RejectError("EMPTY");
  if (buf.length > UPLOAD_LIMITS.maxBytes) throw new RejectError("TOO_LARGE");
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") {
    // An encryption dictionary in the trailer means the text can't be read without a password.
    const tail = buf.subarray(Math.max(0, buf.length - 4096)).toString("latin1");
    const head = buf.subarray(0, Math.min(buf.length, 8192)).toString("latin1");
    if (/\/Encrypt\s/.test(tail) || /\/Encrypt\s/.test(head)) throw new RejectError("ENCRYPTED");
    return "PDF";
  }
  // OLE container: legacy .doc or a password-protected .docx.
  if (buf.readUInt32BE(0) === 0xd0cf11e0) throw new RejectError("ENCRYPTED");
  if (buf.readUInt32LE(0) === 0x04034b50) {
    let entries;
    try {
      entries = readCentralDirectory(buf);
    } catch (e) {
      if (e instanceof ZipError) throw new RejectError(e.reason === "ENCRYPTED" ? "ENCRYPTED" : e.reason === "ZIP_BOMB" ? "ZIP_BOMB" : "CORRUPT");
      throw e;
    }
    if (!entries.has("word/document.xml")) throw new RejectError("WRONG_TYPE");
    if ([...entries.keys()].some((n) => /vbaProject\.bin$/i.test(n))) throw new RejectError("MACROS");
    return "DOCX";
  }
  throw new RejectError("WRONG_TYPE");
}
