import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaForm } from "@/components/admin/mfa-form";
import { requireAdminRole } from "@/server/admin/guard";
import { currentSession } from "@/server/auth/user";
import { supabaseServer } from "@/server/supabase/server";

export const metadata: Metadata = { title: "Admin sign-in", robots: { index: false } };

export default async function AdminMfaPage() {
  await requireAdminRole();
  if ((await currentSession())?.aal === "aal2") redirect("/admin");
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.mfa.listFactors();
  return (
    <main id="main" className="ambient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card flex w-full max-w-md flex-col gap-4 p-6 sm:p-8">
        <h1 className="font-display text-[28px] font-bold leading-tight">Admin second step</h1>
        <MfaForm hasFactor={Boolean(data?.totp?.some((f) => f.status === "verified"))} />
      </div>
    </main>
  );
}
