import "server-only";
import { notFound, redirect } from "next/navigation";
import { currentSession, requireUser } from "../auth/user";

/** Anyone who isn't an admin sees a plain 404, so the area doesn't reveal itself. */
export async function requireAdminRole() {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}

/** Every admin page and action: the admin role, and a second factor passed in this session (ADM-001). */
export async function requireAdmin() {
  const user = await requireAdminRole();
  if ((await currentSession())?.aal !== "aal2") redirect("/admin/mfa");
  return user;
}

/** "na***@gmail.com": enough to tell accounts apart, without showing the address (ADM-002). */
export function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}
