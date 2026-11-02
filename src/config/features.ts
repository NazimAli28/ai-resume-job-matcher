/**
 * Product switches. EMAIL_PASSWORD_AUTH on alongside Google (founder decision 2026-11-03). Until a sending
 * domain is verified in Resend, Supabase's built-in mailer only reaches the project team, so new email
 * sign-ups from anyone else get a clear "use Google" message.
 */
export const FEATURES = {
  EMAIL_PASSWORD_AUTH: true,
} as const;
