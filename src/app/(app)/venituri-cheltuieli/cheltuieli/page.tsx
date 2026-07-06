import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { getContracteCheltuieli, getCheltuieliLinii } from "@/lib/data/cheltuieli";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { runCheltuieliLiniiSync } from "@/lib/cheltuieli-sync";
import { CheltuieliClient } from "@/components/cheltuieli/CheltuieliClient";

export default async function CheltuieliPage() {
  const { supabase, isAdmin } = await requireModuleAccess("venituri_cheltuieli", "cheltuieli");

  const nomenclatoarePromise = getNomenclatoare();

  if (isAdmin) {
    await runCheltuieliLiniiSync(supabase);
  }

  const [contracte, cheltuieliLinii, nomenclatoare] = await Promise.all([
    getContracteCheltuieli(),
    getCheltuieliLinii(),
    nomenclatoarePromise,
  ]);

  return (
    <CheltuieliClient
      contracte={contracte}
      cheltuieliLinii={cheltuieliLinii}
      incadrareOptions={nomenclatoare.cheltuiala_incadrare ?? []}
      clasaOptions={nomenclatoare.cheltuiala_clasa ?? []}
    />
  );
}
