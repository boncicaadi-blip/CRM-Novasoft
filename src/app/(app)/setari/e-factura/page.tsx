import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAnafFacturi } from "@/lib/data/anaf";
import { EFacturaClient } from "@/components/setari/EFacturaClient";

export default async function EFacturaPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/login");

  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (myProfile?.role !== "admin") redirect("/dashboard");

  const facturi = await getAnafFacturi();

  return (
    <div className="px-3 py-4 sm:px-6">
      <EFacturaClient facturi={facturi} />
    </div>
  );
}
