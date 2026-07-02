import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCreanteByFirma, getCreanteIncasari } from "@/lib/data/creante";
import { BackButton } from "@/components/BackButton";
import { FisaClientClient } from "@/components/creante/FisaClientClient";

export default async function FisaClientPage({
  params,
}: {
  params: Promise<{ nume: string }>;
}) {
  const { nume } = await params;
  const numeFirma = decodeURIComponent(nume);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (myProfile?.role !== "admin") redirect("/dashboard");

  const [creante, incasariByCreanta] = await Promise.all([
    getCreanteByFirma(numeFirma),
    getCreanteIncasari(),
  ]);

  return (
    <div className="px-3 py-4 sm:px-6">
      <BackButton />
      <FisaClientClient
        numeFirma={numeFirma}
        creante={creante}
        incasari={incasariByCreanta}
      />
    </div>
  );
}
