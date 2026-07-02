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

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-1 flex items-center gap-2">
        <BackButton />
        <h1 className="text-lg font-heading text-white">Utilizatori</h1>
      </div>
      <p className="mb-5 text-sm text-slate-500">
        Toti utilizatorii cu acces la aplicatie. Click pe iconita de editare pentru a schimba
        numele sau rolul.
      </p>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-[#111535] text-left text-xs text-slate-500">
              <th className="px-3 py-2.5 font-medium">Nume</th>
              <th className="px-3 py-2.5 font-medium">Email</th>
              <th className="px-3 py-2.5 font-medium">Rol</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
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
