import { getCreante, getLastImportBatch, getCreanteIncasari } from "@/lib/data/creante";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { CreanteClient } from "@/components/creante/CreanteClient";

export default async function CreantePage() {
  await requireModuleAccess("creante_obligatii");

  const [creante, lastBatch, incasari] = await Promise.all([
    getCreante(),
    getLastImportBatch(),
    getCreanteIncasari(),
  ]);

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-2"><BackButton /></div>
      <CreanteClient creante={creante} lastBatch={lastBatch} incasari={incasari} />
    </div>
  );
}
