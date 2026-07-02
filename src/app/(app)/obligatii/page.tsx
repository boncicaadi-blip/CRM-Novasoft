import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getObligatii, getLastObligatiiImportBatch, getObligatiiPlati } from "@/lib/data/obligatii";
import { BackButton } from "@/components/BackButton";
import { ObligatiiClient } from "@/components/obligatii/ObligatiiClient";

export default async function ObligatiiPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (myProfile?.role !== "admin") redirect("/dashboard");

  const [obligatii, lastBatch, plati] = await Promise.all([
    getObligatii(),
    getLastObligatiiImportBatch(),
    getObligatiiPlati(),
  ]);

  return (
    <div className="px-3 py-4 sm:px-6">
      <BackButton />
      <ObligatiiClient obligatii={obligatii} lastBatch={lastBatch} plati={plati} />
    </div>
  );
}
