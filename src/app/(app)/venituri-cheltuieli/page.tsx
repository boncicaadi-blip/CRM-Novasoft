import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { getContracte, getVenituriLinii, getClientOptions } from "@/lib/data/venituri";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { runVenituriLiniiSync } from "@/lib/venituri-sync";
import { VenituriCheltuieliClient } from "@/components/venituri/VenituriCheltuieliClient";

export default async function VenituriCheltuieliPage() {
  const { supabase, isAdmin } = await requireModuleAccess("venituri_cheltuieli", "venituri");

  // Nomenclatoarele si lista de clienti nu depind de sincronizare - le
  // pornim imediat, in paralel, in loc sa astepte dupa runVenituriLiniiSync.
  const clientiPromise = getClientOptions();
  const nomenclatoarePromise = getNomenclatoare();

  // Contracte/linii TREBUIE sa astepte sincronizarea, ca sa reflecte liniile
  // proaspat generate - functie "pura", fara revalidatePath (interzis in
  // timpul randarii unei pagini). Doar admin poate scrie, dar sincronizarea
  // aici e sigura de incercat oricum - RLS oricum ar bloca scrierea daca nu
  // are drept, deci pentru non-admin pur si simplu nu se intampla nimic.
  if (isAdmin) {
    await runVenituriLiniiSync(supabase);
  }

  const [contracte, venituriLinii, clienti, nomenclatoare] = await Promise.all([
    getContracte(),
    getVenituriLinii(),
    clientiPromise,
    nomenclatoarePromise,
  ]);

  return (
    <VenituriCheltuieliClient
      contracte={contracte}
      venituriLinii={venituriLinii}
      clienti={clienti}
      produseOptions={nomenclatoare.venit_produs ?? []}
      serviciiOptions={nomenclatoare.venit_serviciu ?? []}
      modalitatiOptions={nomenclatoare.modalitate_facturare ?? []}
      stadiiOptions={nomenclatoare.stadiu_contract ?? []}
    />
  );
}
