import { getObligatii, getLastObligatiiImportBatch, getObligatiiPlati } from "@/lib/data/obligatii";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { ObligatiiClient } from "@/components/obligatii/ObligatiiClient";

export default async function ObligatiiPage() {
  await requireModuleAccess("creante_obligatii", "obligatii");

  const [obligatii, lastBatch, plati, nomenclatoare] = await Promise.all([
    getObligatii(),
    getLastObligatiiImportBatch(),
    getObligatiiPlati(),
    getNomenclatoare(),
  ]);

  const modalitatePlataOptions = (nomenclatoare.obligatie_modalitate_plata ?? []).map((n) => n.valoare);

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-2"><BackButton /></div>
      <ObligatiiClient
        obligatii={obligatii}
        lastBatch={lastBatch}
        plati={plati}
        modalitatePlataOptions={modalitatePlataOptions}
      />
    </div>
  );
}
