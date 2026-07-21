import { getObligatii, getObligatiiPlati, getObligatiiTargetsLunare } from "@/lib/data/obligatii";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { ObligatiiDashboardClient } from "@/components/obligatii/dashboard/ObligatiiDashboardClient";

export default async function ObligatiiDashboardPage() {
  await requireModuleAccess("creante_obligatii", "obligatii_dashboard");

  const [obligatii, plati, targets, nomenclatoare] = await Promise.all([
    getObligatii(),
    getObligatiiPlati(),
    getObligatiiTargetsLunare(),
    getNomenclatoare(),
  ]);

  const modalitatePlataOptions = (nomenclatoare.obligatie_modalitate_plata ?? []).map((n) => n.valoare);

  return (
    <div>
      <div className="px-4 pt-4 sm:px-6">
        <BackButton />
      </div>
      <ObligatiiDashboardClient
        obligatii={obligatii}
        plati={plati}
        targets={targets}
        modalitatePlataOptions={modalitatePlataOptions}
      />
    </div>
  );
}
