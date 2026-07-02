import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getObligatiiByFurnizor, getObligatiiPlati } from "@/lib/data/obligatii";
import { BackButton } from "@/components/BackButton";
import { FisaFurnizorClient } from "@/components/obligatii/FisaFurnizorClient";

export default async function FisaFurnizorPage({
  params,
}: {
  params: Promise<{ nume: string }>;
}) {
  const { nume } = await params;
  const numeFurnizor = decodeURIComponent(nume);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (myProfile?.role !== "admin") redirect("/dashboard");

  const [obligatii, platiByObligatie] = await Promise.all([
    getObligatiiByFurnizor(numeFurnizor),
    getObligatiiPlati(),
  ]);

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-2"><BackButton /></div>
      <FisaFurnizorClient
        numeFurnizor={numeFurnizor}
        obligatii={obligatii}
        plati={platiByObligatie}
      />
    </div>
  );
}
