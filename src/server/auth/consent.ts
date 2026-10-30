import "server-only";
import { LEGAL } from "@/config/legal";
import type { ConsentType } from "@/generated/prisma/client";
import { db } from "../db";

/** Append signup consents: age + terms + privacy (required) and marketing (optional, recorded either way). */
export async function recordSignupConsent(userId: string, marketing: boolean, ipPrefix: string) {
  const row = (type: ConsentType, granted: boolean, docVersion: string) => ({ userId, type, granted, docVersion, ipPrefix });
  await db.consentRecord.createMany({
    data: [
      row("AGE_16_PLUS", true, "age@16"),
      row("TERMS", true, LEGAL.terms),
      row("PRIVACY", true, LEGAL.privacy),
      row("MARKETING_EMAIL", marketing, "marketing@2026-10-30"),
    ],
  });
}
