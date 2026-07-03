import { getCreante, getCreanteIncasari } from "@/lib/data/creante";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { CreanteDashboardClient } from "@/components/creante/dashboard/CreanteDashboardClient";

export default async function CreanteDashboardPage() {
  await requireModuleAccess("creante_obligatii");

  const [creante, incasari] = await Promise.all([getCreante(), getCreanteIncasari()]);

  return (
    <div>
      <div className="px-4 pt-4 sm:px-6">
        <BackButton />
      </div>
      <CreanteDashboardClient creante={creante} incasari={incasari} />
    </div>
  );
}
