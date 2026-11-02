/** Local-only test account. See src/app/dev-login/route.ts. Safe for the proxy to import: no server-only code. */
export const DEV_LOGIN_COOKIE = "dev_login";
export const DEV_USER_ID = "00000000-0000-4000-8000-0000000000de";

export function isDevLoginAllowed(hostname: string): boolean {
  return process.env.NODE_ENV === "development" && (hostname === "localhost" || hostname === "127.0.0.1");
}
