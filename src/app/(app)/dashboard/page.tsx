import { getOpportunities, getAllHistory } from "@/lib/data/opportunities";
import { getAllNomenclatoare } from "@/lib/data/nomenclatoare";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { STAGES } from "@/lib/constants";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";

export default async function DashboardPage() {
  await requireModuleAccess("crm", "dashboard");

  const [opportunities, history, allNomenclatoare] = await Promise.all([
    getOpportunities(),
    getAllHistory(),
    getAllNomenclatoare(),
  ]);

  // Pentru ordinea afisata in grafice folosim TOATE stage-urile (inclusiv
  // cele dezactivate ulterior din Setari) - un stage poate fi "inactiv"
  // (nu mai apare ca optiune noua de ales) dar tot exista oportunitati
  // reale care il folosesc; daca l-am exclude din ordine, acele
  // oportunitati ar fi sortate gresit (indexOf = -1, plasate primele).
  const stageOrderRows = allNomenclatoare
    .filter((n) => n.categorie === "stage")
    .sort((a, b) => a.ordine - b.ordine);
  const stageOrder =
    stageOrderRows.length > 0
      ? stageOrderRows.map((s) => s.valoare)
      : (STAGES as unknown as string[]);

  return <DashboardClient opportunities={opportunities} history={history} stageOrder={stageOrder} />;
}
