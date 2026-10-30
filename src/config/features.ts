/**
 * Product switches. EMAIL_PASSWORD_AUTH stays off until a sending domain is verified in Resend
 * (Supabase's built-in mailer only reaches the project team). Founder decision 2026-10-31.
 */
export const FEATURES = {
  EMAIL_PASSWORD_AUTH: false,
} as const;
