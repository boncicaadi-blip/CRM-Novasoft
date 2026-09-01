import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/BackButton";
import { UserRow } from "@/components/setari/UserRow";

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

  const nrInAsteptare = (profiles ?? []).filter((p) => !p.approved).length;

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-1 flex items-center gap-2">
        <BackButton />
        <h1 className="text-lg font-heading text-text-primary">Utilizatori</h1>
      </div>
      <p className="mb-3 text-sm text-text-muted">
        Toti utilizatorii cu acces la aplicatie. Click pe iconita de editare pentru a schimba
        numele sau rolul.
      </p>

      {nrInAsteptare > 0 && (
        <p className="mb-5 flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-semibold text-[#0B0D1A]">
            {nrInAsteptare}
          </span>
          {nrInAsteptare === 1 ? "cont nou" : "conturi noi"} in asteptare de aprobare - vezi mai
          jos, in coloana &quot;Status&quot;, si apasa &quot;Aproba&quot; pentru cel/cele care ar
          trebui sa aiba acces.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border-subtle">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-xs text-text-muted">
              <th className="px-3 py-2.5 font-medium">Nume</th>
              <th className="px-3 py-2.5 font-medium">Email</th>
              <th className="px-3 py-2.5 font-medium">Rol</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Popup zilnic</th>
              <th className="px-3 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <UserRow key={p.id} user={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
