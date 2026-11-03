import "server-only";
import { db } from "./db";
import { pepperHash } from "./http/request";

export const FUNNEL = ["SIGNED_IN", "RESUME_CHECKED", "JOB_MATCHED", "APPLICATION_ADDED", "MARKED_APPLIED"] as const;
export type ProductEventName = (typeof FUNNEL)[number];

/**
 * First-party usage count: a fixed name and a keyed hash, nothing else. Honors the Settings switch
 * (on unless turned off). Never throws, because counting must not break the feature being counted.
 */
export async function track(userId: string, name: ProductEventName) {
  try {
    const choice = await db.consentRecord.findFirst({ where: { userId, type: "ANALYTICS_COOKIES" }, orderBy: { createdAt: "desc" }, select: { granted: true } });
    if (choice && !choice.granted) return;
    await db.productEvent.create({ data: { name, userIdHash: pepperHash(userId) } });
  } catch {
    console.error("product event failed");
  }
}
