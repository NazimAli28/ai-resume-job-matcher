import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { LEGAL } from "@/config/legal";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { supabaseAdmin } from "../supabase/admin";
import { extract } from "./extract";
import { RejectError, UPLOAD_LIMITS, type RejectReason } from "./files/sniff";
import { analyze } from "./rules";
import { buildResumeDoc } from "./structure";

const BUCKET = "resumes";
/** Free beta: 3 analyses a month × 2 (PRD §5b). Moves to UsageLedger/entitlements in Phase 8. */
export const MONTHLY_ANALYSES = 6;

export class QuotaError extends Error {}
export class NotFoundError extends Error {}

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

export async function analysesThisMonth(userId: string) {
  return db.resumeUpload.count({ where: { userId, createdAt: { gte: monthStart() }, status: { in: ["PARSED", "PENDING", "UPLOADED"] } } });
}

export async function hasSensitiveConsent(userId: string) {
  const c = await db.consentRecord.findFirst({ where: { userId, type: "SENSITIVE_DATA" }, orderBy: { createdAt: "desc" } });
  return Boolean(c?.granted);
}

/**
 * Step 1: reserve an upload and hand back a one-time signed upload URL. The browser sends the
 * file straight to private storage (Vercel caps request bodies at 4.5 MB).
 */
export async function createUpload(userId: string, file: { name: string; size: number }, opts: { consentIpPrefix: string; consentGiven: boolean }) {
  if (file.size <= 0 || file.size > UPLOAD_LIMITS.maxBytes) throw new RejectError(file.size <= 0 ? "EMPTY" : "TOO_LARGE");
  const ext = file.name.toLowerCase().match(/\.(pdf|docx)$/)?.[1];
  if (!ext) throw new RejectError("WRONG_TYPE");
  if ((await analysesThisMonth(userId)) >= MONTHLY_ANALYSES) throw new QuotaError();

  if (!(await hasSensitiveConsent(userId))) {
    if (!opts.consentGiven) throw new Error("consent_required");
    await db.consentRecord.create({ data: { userId, type: "SENSITIVE_DATA", granted: true, docVersion: LEGAL.privacy, ipPrefix: opts.consentIpPrefix } });
  }

  const id = randomUUID();
  const storageKey = `u/${userId}/uploads/${id}.${ext}`;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(storageKey);
  if (error || !data) throw new Error(`signed upload failed: ${error?.message ?? "no data"}`);
  // originalName is display-only and never used in a path.
  await db.resumeUpload.create({
    data: { id, userId, storageKey, originalName: file.name.replace(/[^\w .()\-]/g, "_").slice(0, 120), sizeBytes: file.size },
  });
  return { uploadId: id, path: data.path, token: data.token };
}

async function removeFile(storageKey: string, uploadId: string) {
  await supabaseAdmin().storage.from(BUCKET).remove([storageKey]);
  await db.resumeUpload.update({ where: { id: uploadId }, data: { fileDeletedAt: new Date() } });
}

/** Step 2: the file is in storage. Validate it by content, extract, analyze, save a version. */
export async function finalizeUpload(userId: string, uploadId: string): Promise<{ ok: true; versionId: string } | { ok: false; reason: RejectReason }> {
  const up = await db.resumeUpload.findFirst({ where: { id: uploadId, userId, status: "PENDING" } });
  if (!up) throw new NotFoundError();

  const { data: blob, error } = await supabaseAdmin().storage.from(BUCKET).download(up.storageKey);
  if (error || !blob) {
    await db.resumeUpload.update({ where: { id: up.id }, data: { status: "FAILED", rejectReason: "NOT_RECEIVED" } });
    throw new Error("upload not found in storage");
  }
  const buf = Buffer.from(await blob.arrayBuffer());

  const reject = async (reason: RejectReason) => {
    await db.resumeUpload.update({ where: { id: up.id }, data: { status: "REJECTED", rejectReason: reason, sizeBytes: buf.length } });
    await removeFile(up.storageKey, up.id); // never keep files we refused
    return { ok: false as const, reason };
  };
  if (buf.length > UPLOAD_LIMITS.maxBytes) return reject("TOO_LARGE");

  let extraction;
  try {
    extraction = await extract(buf);
  } catch (e) {
    if (e instanceof RejectError) return reject(e.reason);
    throw e;
  }

  const profile = await db.profile.findUnique({ where: { userId }, select: { targetMarket: true, deleteOriginalAfterParse: true } });
  const targetMarket = profile?.targetMarket ?? "PK_LOCAL";
  const doc = buildResumeDoc(extraction);
  const result = analyze(extraction, doc, { targetMarket, fileBytes: buf.length });
  const count = await db.resumeVersion.count({ where: { userId } });
  const content = doc as unknown as Prisma.InputJsonValue;

  const version = await db.$transaction(async (tx) => {
    await tx.resumeUpload.update({
      where: { id: up.id },
      data: {
        status: "PARSED",
        kind: extraction.kind,
        pageCount: extraction.pageCount,
        sizeBytes: buf.length,
        sha256: createHash("sha256").update(buf).digest("hex"),
        atsText: extraction.atsText,
      },
    });
    const v = await tx.resumeVersion.create({
      data: {
        userId,
        uploadId: up.id,
        label: `v${count + 1}`,
        name: up.originalName.replace(/\.(pdf|docx)$/i, "").slice(0, 80) || "Resume",
        source: "UPLOAD",
        targetMarket,
        content,
        contentHash: createHash("sha256").update(JSON.stringify(doc)).digest("hex"),
      },
    });
    await tx.resumeAnalysis.create({
      data: {
        userId,
        resumeVersionId: v.id,
        parseHealth: result.parseHealth,
        readability: result.readability,
        parts: result.readabilityParts as Prisma.InputJsonValue,
        findings: result.findings as unknown as Prisma.InputJsonValue,
        engineVersion: result.engineVersion,
      },
    });
    return v;
  });

  if (profile?.deleteOriginalAfterParse) await removeFile(up.storageKey, up.id);
  return { ok: true, versionId: version.id };
}

export async function listVersions(userId: string) {
  return db.resumeVersion.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      name: true,
      source: true,
      state: true,
      targetMarket: true,
      createdAt: true,
      upload: { select: { kind: true, pageCount: true, fileDeletedAt: true } },
      analyses: { orderBy: { createdAt: "desc" }, take: 1, select: { parseHealth: true, readability: true } },
    },
  });
}

export async function getVersion(userId: string, id: string) {
  return db.resumeVersion.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      upload: { select: { kind: true, pageCount: true, atsText: true, originalName: true, fileDeletedAt: true, sizeBytes: true } },
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

/** Delete a version; if it was the last one using its upload, delete the stored file too. */
export async function deleteVersion(userId: string, id: string) {
  const v = await db.resumeVersion.findFirst({ where: { id, userId }, include: { upload: true } });
  if (!v) throw new NotFoundError();
  if (v.lockedAt) {
    await db.resumeVersion.update({ where: { id }, data: { state: "ARCHIVED", deletedAt: new Date() } });
    return;
  }
  await db.resumeVersion.delete({ where: { id } });
  if (v.upload) {
    const others = await db.resumeVersion.count({ where: { uploadId: v.upload.id } });
    if (!others) {
      if (!v.upload.fileDeletedAt) await supabaseAdmin().storage.from(BUCKET).remove([v.upload.storageKey]);
      await db.resumeUpload.delete({ where: { id: v.upload.id } });
    }
  }
}

/** Short-lived (60 s) link to the user's own original file. */
export async function originalDownloadUrl(userId: string, versionId: string) {
  const v = await db.resumeVersion.findFirst({ where: { id: versionId, userId }, include: { upload: true } });
  if (!v?.upload || v.upload.fileDeletedAt) throw new NotFoundError();
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(v.upload.storageKey, 60, { download: v.upload.originalName });
  if (error || !data) throw new Error("signed download failed");
  return data.signedUrl;
}
