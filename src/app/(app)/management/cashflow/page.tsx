import { getCreante, getCreanteIncasari } from "@/lib/data/creante";
import { getObligatii, getObligatiiPlati } from "@/lib/data/obligatii";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { CashflowClient } from "@/components/management/cashflow/CashflowClient";

export default async function CashflowPage() {
  await requireModuleAccess("management");

  const [creante, creanteIncasari, obligatii, obligatiiPlati] = await Promise.all([
    getCreante(),
    getCreanteIncasari(),
    getObligatii(),
    getObligatiiPlati(),
  ]);

  return (
    <CashflowClient
      creante={creante}
      creanteIncasari={creanteIncasari}
      obligatii={obligatii}
      obligatiiPlati={obligatiiPlati}
    />
  );
}
