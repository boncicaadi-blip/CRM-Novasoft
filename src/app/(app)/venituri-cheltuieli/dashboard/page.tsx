import { getContracte, getVenituriLinii, getPartnersGrupLookup } from "@/lib/data/venituri";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { VenituriDashboardClient } from "@/components/venituri/dashboard/VenituriDashboardClient";

export default async function VenituriDashboardPage() {
  await requireModuleAccess("venituri_cheltuieli");

  const [venituriLinii, contracte, partnersGrup] = await Promise.all([
    getVenituriLinii(),
    getContracte(),
    getPartnersGrupLookup(),
  ]);

  return (
    <div>
      <div className="px-4 pt-4 sm:px-6">
        <BackButton />
      </div>
      <VenituriDashboardClient venituriLinii={venituriLinii} contracte={contracte} partnersGrup={partnersGrup} />
    </div>
  );
}
