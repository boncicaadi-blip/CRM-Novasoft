import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/BackButton";

export default async function UtilizatoriPage() {
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

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  return (
    <div className="px-3 py-4 sm:px-6">
      <BackButton />
      <h1 className="mb-1 text-lg font-heading text-white">Utilizatori</h1>
      <p className="mb-5 text-sm text-slate-500">
        Toti utilizatorii cu acces la aplicatie. Gestionarea rolurilor si drepturilor detaliate
        urmeaza intr-o etapa viitoare.
      </p>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-[#111535] text-left text-xs text-slate-500">
              <th className="px-3 py-2.5 font-medium">Nume</th>
              <th className="px-3 py-2.5 font-medium">Email</th>
              <th className="px-3 py-2.5 font-medium">Rol</th>
              <th className="px-3 py-2.5 font-medium">Cont creat</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="px-3 py-2.5 text-white">{p.full_name}</td>
                <td className="px-3 py-2.5 text-slate-400">{p.email}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      p.role === "admin"
                        ? "bg-[#E8007A]/20 text-[#E8007A]"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {p.role === "admin" ? "Administrator" : "Utilizator"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500">
                  {new Date(p.created_at).toLocaleDateString("ro-RO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
