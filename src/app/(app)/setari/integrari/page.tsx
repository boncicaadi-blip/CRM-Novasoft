import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getTermeneCredentials } from "@/lib/data/apiCredentials";
import { getAnafConnectionStatus, getAnafFacturi } from "@/lib/data/anaf";
import { TermeneCredentialsForm } from "@/components/setari/TermeneCredentialsForm";
import { AnafConnectionCard } from "@/components/setari/AnafConnectionCard";

export default async function IntegrariPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (myProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  const [termeneCreds, anafStatus, anafFacturi] = await Promise.all([
    getTermeneCredentials(),
    getAnafConnectionStatus(),
    getAnafFacturi(),
  ]);

  return (
    <div className="px-3 py-4 sm:px-6">
      <h1 className="mb-1 text-lg font-heading text-text-primary">Integrari</h1>
      <p className="mb-5 text-sm text-text-muted">
        Credentiale pentru servicii externe folosite de aplicatie.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="mb-3 text-sm font-medium text-text-primary">Termene.ro</p>
          <p className="mb-4 text-xs text-text-muted">
            Folosit pentru butonul &quot;Actualizeaza din ANAF&quot; (cifra de afaceri, nr.
            angajati) si auto-completare la introducerea CUI-ului.
          </p>
          <TermeneCredentialsForm initial={termeneCreds} />
        </div>

        <Suspense fallback={null}>
          <AnafConnectionCard status={anafStatus} facturi={anafFacturi} />
        </Suspense>
      </div>
    </div>
  );
}
