import { getCreante, getLastImportBatch, getCreanteIncasari } from "@/lib/data/creante";
import { getClientOptions } from "@/lib/data/venituri";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { CreanteClient } from "@/components/creante/CreanteClient";

export default async function CreantePage() {
  await requireModuleAccess("creante_obligatii", "creante");

  const [creante, lastBatch, incasari, clienti] = await Promise.all([
    getCreante(),
    getLastImportBatch(),
    getCreanteIncasari(),
    getClientOptions(),
  ]);

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-2"><BackButton /></div>
      <CreanteClient creante={creante} lastBatch={lastBatch} incasari={incasari} clienti={clienti} />
    </div>
  );
}
