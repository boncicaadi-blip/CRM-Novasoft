import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { getContracte, getVenituriLinii } from "@/lib/data/venituri";
import { syncVenituriLiniiAction } from "@/lib/actions/venituri";
import { VenituriCheltuieliClient } from "@/components/venituri/VenituriCheltuieliClient";

export default async function VenituriCheltuieliPage() {
  await requireModuleAccess("venituri_cheltuieli");

  // La fiecare vizitare, generam liniile lunare lipsa pentru contractele
  // active - la fel cum sincronizam targetul curent la Creante.
  await syncVenituriLiniiAction();

  const [contracte, venituriLinii] = await Promise.all([getContracte(), getVenituriLinii()]);

  return <VenituriCheltuieliClient contracte={contracte} venituriLinii={venituriLinii} />;
}
