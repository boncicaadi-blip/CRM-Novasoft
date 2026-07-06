import { getVenituriLinii } from "@/lib/data/venituri";
import { getCheltuieliLinii } from "@/lib/data/cheltuieli";
import { getAngajatiLunar } from "@/lib/data/angajati";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { ManagementDashboardClient } from "@/components/management/dashboard/ManagementDashboardClient";

export default async function ManagementPage() {
  await requireModuleAccess("management");

  const [venituriLinii, cheltuieliLinii, angajati] = await Promise.all([
    getVenituriLinii(),
    getCheltuieliLinii(),
    getAngajatiLunar(),
  ]);

  return (
    <ManagementDashboardClient
      venituriLinii={venituriLinii}
      cheltuieliLinii={cheltuieliLinii}
      angajati={angajati}
    />
  );
}
