import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCreante, getLastImportBatch } from "@/lib/data/creante";
import { BackButton } from "@/components/BackButton";
import { CreanteClient } from "@/components/creante/CreanteClient";

export default async function CreantePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (myProfile?.role !== "admin") redirect("/dashboard");

  const [creante, lastBatch] = await Promise.all([getCreante(), getLastImportBatch()]);

  return (
    <div className="px-3 py-4 sm:px-6">
      <BackButton />
      <CreanteClient creante={creante} lastBatch={lastBatch} />
    </div>
  );
}
