import { getObligatii, getObligatiiPlati, getObligatiiTargetsLunare } from "@/lib/data/obligatii";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { ObligatiiDashboardClient } from "@/components/obligatii/dashboard/ObligatiiDashboardClient";

export default async function ObligatiiDashboardPage() {
  await requireModuleAccess("creante_obligatii");

  const [obligatii, plati, targets] = await Promise.all([
    getObligatii(),
    getObligatiiPlati(),
    getObligatiiTargetsLunare(),
  ]);

  return (
    <div>
      <div className="px-4 pt-4 sm:px-6">
        <BackButton />
      </div>
      <ObligatiiDashboardClient obligatii={obligatii} plati={plati} targets={targets} />
    </div>
  );
}
