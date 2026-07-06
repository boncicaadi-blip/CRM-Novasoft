import { getContracteCheltuieli, getCheltuieliLinii } from "@/lib/data/cheltuieli";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { CheltuieliDashboardClient } from "@/components/cheltuieli/dashboard/CheltuieliDashboardClient";

export default async function CheltuieliDashboardPage() {
  await requireModuleAccess("venituri_cheltuieli", "cheltuieli_dashboard");

  const [cheltuieliLinii, contracte] = await Promise.all([getCheltuieliLinii(), getContracteCheltuieli()]);

  return (
    <div>
      <div className="px-4 pt-4 sm:px-6">
        <BackButton />
      </div>
      <CheltuieliDashboardClient cheltuieliLinii={cheltuieliLinii} contracte={contracte} />
    </div>
  );
}
