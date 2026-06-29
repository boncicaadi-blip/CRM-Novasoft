import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTermeneCredentials } from "@/lib/data/apiCredentials";
import { TermeneCredentialsForm } from "@/components/setari/TermeneCredentialsForm";

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

  const termeneCreds = await getTermeneCredentials();

  return (
    <div className="px-3 py-4 sm:px-6">
      <h1 className="mb-1 text-lg font-heading text-white">Integrari</h1>
      <p className="mb-5 text-sm text-slate-500">
        Credentiale pentru servicii externe folosite de aplicatie.
      </p>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="mb-3 text-sm font-medium text-white">Termene.ro</p>
        <p className="mb-4 text-xs text-slate-500">
          Folosit pentru butonul &quot;Actualizeaza din ANAF&quot; (cifra de afaceri, nr.
          angajati) si auto-completare la introducerea CUI-ului.
        </p>
        <TermeneCredentialsForm initial={termeneCreds} />
      </div>
    </div>
  );
}
