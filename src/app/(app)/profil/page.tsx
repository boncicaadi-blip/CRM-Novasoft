import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/BackButton";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  return (
    <div className="px-3 py-4 sm:px-6">
      <BackButton />
      <h1 className="mb-1 text-lg font-heading text-white">Profilul meu</h1>
      <p className="mb-5 text-sm text-slate-500">Datele tale de cont si securitate.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Date cont
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Nume</span>
              <span className="text-slate-200">{profile?.full_name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="text-slate-200">{data.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Rol</span>
              <span className="text-slate-200">
                {profile?.role === "admin" ? "Administrator" : "Utilizator"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Schimba parola
          </p>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
