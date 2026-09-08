import { getAngajatiList, getConcediiCereri } from "@/lib/data/concedii";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { ConcediiCalendarClient } from "@/components/concedii/ConcediiCalendarClient";

export default async function ConcediiPage() {
  const { role } = await requireModuleAccess("concedii", "calendar");

  const [angajati, cereri] = await Promise.all([getAngajatiList(), getConcediiCereri()]);

  return <ConcediiCalendarClient angajati={angajati} cereri={cereri} poateEdita={role !== "viewer"} />;
}
