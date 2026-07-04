import { getContracte, getVenituriLinii } from "@/lib/data/venituri";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { VenituriDashboardClient } from "@/components/venituri/dashboard/VenituriDashboardClient";

export default async function VenituriDashboardPage() {
  await requireModuleAccess("venituri_cheltuieli");

  const [venituriLinii, contracte] = await Promise.all([getVenituriLinii(), getContracte()]);

  return (
    <div>
      <div className="px-4 pt-4 sm:px-6">
        <BackButton />
      </div>
      <VenituriDashboardClient venituriLinii={venituriLinii} contracte={contracte} />
    </div>
  );
}
