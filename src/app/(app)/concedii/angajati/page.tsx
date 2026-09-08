import { redirect } from "next/navigation";
import { getAngajatiList } from "@/lib/data/concedii";
import { getProfiles } from "@/lib/data/opportunities";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { AngajatiRegistruClient } from "@/components/concedii/AngajatiRegistruClient";

export default async function AngajatiRegistruPage() {
  const { role } = await requireModuleAccess("concedii", "angajati");
  // Registrul de angajati e vizibil doar pentru admin/editor - un
  // utilizator "viewer" nu are voie sa vada datele complete ale echipei.
  if (role === "viewer") redirect("/concedii");

  const [angajati, profiles] = await Promise.all([getAngajatiList(), getProfiles()]);

  return <AngajatiRegistruClient angajati={angajati} profiles={profiles} />;
}
