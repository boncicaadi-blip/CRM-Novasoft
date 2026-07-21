import { getCreante, getCreanteIncasari } from "@/lib/data/creante";
import { getObligatii, getObligatiiPlati } from "@/lib/data/obligatii";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { CashflowClient } from "@/components/management/cashflow/CashflowClient";

export default async function CashflowPage() {
  await requireModuleAccess("management", "cashflow");

  const [creante, creanteIncasari, obligatii, obligatiiPlati, nomenclatoare] = await Promise.all([
    getCreante(),
    getCreanteIncasari(),
    getObligatii(),
    getObligatiiPlati(),
    getNomenclatoare(),
  ]);

  const modalitatePlataOptions = (nomenclatoare.obligatie_modalitate_plata ?? []).map((n) => n.valoare);

  return (
    <CashflowClient
      creante={creante}
      creanteIncasari={creanteIncasari}
      obligatii={obligatii}
      obligatiiPlati={obligatiiPlati}
      modalitatePlataOptions={modalitatePlataOptions}
    />
  );
}
