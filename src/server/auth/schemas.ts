import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
// 10+ characters (AUTH-001); 72 is bcrypt's input limit.
export const passwordSchema = z.string().min(10, "Use at least 10 characters.").max(72, "Use 72 characters or fewer.");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().max(80).optional().default(""),
  accept: z.literal("on", { message: "Please confirm you are 16 or older and accept the Terms and Privacy Policy." }),
  marketing: z.literal("on").optional(),
});

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.").max(72) });
export const resetRequestSchema = z.object({ email: emailSchema });
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The passwords don't match.", path: ["confirm"] });

/** Only same-site relative paths, so a crafted ?next= can't send users to another site. */
export function safeNext(next: string | null | undefined, fallback = "/app"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
