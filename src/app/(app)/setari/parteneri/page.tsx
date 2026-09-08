import { getPartnersOverview } from "@/lib/data/parteneri-admin";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { ParteneriClient } from "@/components/setari/ParteneriClient";

export default async function ParteneriPage() {
  await requireModuleAccess("crm", "parteneri");

  const partners = await getPartnersOverview();

  return (
    <div className="px-3 py-4 sm:px-6">
      <ParteneriClient partners={partners} />
    </div>
  );
}
