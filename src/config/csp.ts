/**
 * Script policy for pages that handle passwords or personal data: only scripts carrying this request's
 * nonce may run, so injected markup can't execute. These pages must render per request to receive a nonce
 * ((auth) forces that; /app and /admin read cookies). Public marketing pages stay static, hold no user
 * data, and keep the baseline headers from next.config.ts.
 */
export function buildCsp(nonce: string, supabaseUrl: string | undefined, dev: boolean) {
  const supabase = supabaseUrl ?? "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Motion and charts set inline style attributes. Styles can't run code.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${supabase}${dev ? " ws://localhost:*" : ""}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    `form-action 'self' ${supabase} https://accounts.google.com`.trim(),
  ].join("; ");
}
