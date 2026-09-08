import { redirect } from "next/navigation";
import { getAngajatiList, getConcediiCereri, getConcediiSold } from "@/lib/data/concedii";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { RaportConcediiClient } from "@/components/concedii/RaportConcediiClient";

export default async function RaportConcediiPage() {
  const { role } = await requireModuleAccess("concedii", "raport");
  // Raportul de Concedii e vizibil doar pentru admin/editor - un utilizator
  // "viewer" nu are voie sa vada nici macar datele lui aici (le vede in
  // schimb pe "Cererile mele").
  if (role === "viewer") redirect("/concedii");

  const [angajati, cereri, solduri] = await Promise.all([
    getAngajatiList(),
    getConcediiCereri(),
    getConcediiSold(),
  ]);

  return <RaportConcediiClient angajati={angajati} cereri={cereri} solduri={solduri} />;
}
