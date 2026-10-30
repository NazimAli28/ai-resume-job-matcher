import { inflateRawSync } from "node:zlib";

/**
 * Minimal, defensive ZIP reader for DOCX files (no dependency). It reads the central directory
 * only, refuses archives that could exhaust memory, and inflates single entries with a hard cap.
 * Limits from PRD §5b: ≤ 200 entries, ≤ 25 MB uncompressed in total.
 */
export const ZIP_LIMITS = { maxEntries: 200, maxTotalUncompressed: 25 * 1024 * 1024, maxEntry: 10 * 1024 * 1024, maxRatio: 200 };

export class ZipError extends Error {
  constructor(public reason: "NOT_ZIP" | "ZIP_BOMB" | "ENCRYPTED" | "CORRUPT") {
    super(reason);
  }
}

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  localOffset: number;
  encrypted: boolean;
}

export function readCentralDirectory(buf: Buffer): Map<string, ZipEntry> {
  // End of central directory record: signature 0x06054b50, within the last 64 KB + 22 bytes.
  const min = Math.max(0, buf.length - 65557);
  let eocd = -1;
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipError("NOT_ZIP");
  const count = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (count > ZIP_LIMITS.maxEntries) throw new ZipError("ZIP_BOMB");
  if (cdOffset + cdSize > buf.length) throw new ZipError("CORRUPT");

  const entries = new Map<string, ZipEntry>();
  let total = 0;
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new ZipError("CORRUPT");
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    const encrypted = (flags & 0x1) === 1;
    if (encrypted) throw new ZipError("ENCRYPTED");
    if (size > ZIP_LIMITS.maxEntry) throw new ZipError("ZIP_BOMB");
    if (compressedSize > 0 && size / compressedSize > ZIP_LIMITS.maxRatio) throw new ZipError("ZIP_BOMB");
    total += size;
    if (total > ZIP_LIMITS.maxTotalUncompressed) throw new ZipError("ZIP_BOMB");
    entries.set(name, { name, method, compressedSize, size, localOffset, encrypted });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Inflate one entry, capped at its declared size (a lying header can't blow up memory). */
export function readEntry(buf: Buffer, e: ZipEntry): Buffer {
  const p = e.localOffset;
  if (p + 30 > buf.length || buf.readUInt32LE(p) !== 0x04034b50) throw new ZipError("CORRUPT");
  const nameLen = buf.readUInt16LE(p + 26);
  const extraLen = buf.readUInt16LE(p + 28);
  const start = p + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + e.compressedSize);
  if (e.method === 0) return Buffer.from(data);
  if (e.method !== 8) throw new ZipError("CORRUPT");
  try {
    return inflateRawSync(data, { maxOutputLength: Math.min(e.size, ZIP_LIMITS.maxEntry) + 1 });
  } catch {
    throw new ZipError("ZIP_BOMB");
  }
}
