import { getVenituriLinii } from "@/lib/data/venituri";
import { getCheltuieliLinii } from "@/lib/data/cheltuieli";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { PlClient } from "@/components/management/pl/PlClient";

export default async function PlPage() {
  await requireModuleAccess("management", "pl");

  const [venituriLinii, cheltuieliLinii, nomenclatoare] = await Promise.all([
    getVenituriLinii(),
    getCheltuieliLinii(),
    getNomenclatoare(),
  ]);

  const incadrareOrdine = (nomenclatoare.cheltuiala_incadrare ?? []).map((n) => n.valoare);

  return <PlClient venituriLinii={venituriLinii} cheltuieliLinii={cheltuieliLinii} incadrareOrdine={incadrareOrdine} />;
}
