import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/BackButton";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { ThemeSelector } from "@/components/profile/ThemeSelector";

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
      <div className="mb-1 flex items-center gap-2">
        <BackButton />
        <h1 className="text-lg font-heading text-text-primary">Profilul meu</h1>
      </div>
      <p className="mb-5 text-sm text-text-muted">Datele tale de cont si securitate.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
            Date cont
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Nume</span>
              <span className="text-text-primary">{profile?.full_name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Email</span>
              <span className="text-text-primary">{data.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Rol</span>
              <span className="text-text-primary">
                {profile?.role === "admin" ? "Administrator" : "Utilizator"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
            Schimba parola
          </p>
          <ChangePasswordForm />
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
            Aspect
          </p>
          <ThemeSelector initialTheme={profile?.theme ?? "dark"} />
          <p className="mt-2 text-[11px] text-text-muted">
            Tema luminoasa e disponibila momentan partial - o extindem treptat la toate paginile.
          </p>
        </div>
      </div>
    </div>
  );
}
