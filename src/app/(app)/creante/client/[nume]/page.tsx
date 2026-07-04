import { getCreanteByFirma, getCreanteIncasari } from "@/lib/data/creante";
import { getClientCrossLinks } from "@/lib/data/partners";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { FisaClientClient } from "@/components/creante/FisaClientClient";

export default async function FisaClientPage({
  params,
}: {
  params: Promise<{ nume: string }>;
}) {
  const { nume } = await params;
  const numeFirma = decodeURIComponent(nume);

  await requireModuleAccess("creante_obligatii");

  const [creante, incasariByCreanta, crossLinks] = await Promise.all([
    getCreanteByFirma(numeFirma),
    getCreanteIncasari(),
    getClientCrossLinks(numeFirma),
  ]);

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-2"><BackButton /></div>
      <FisaClientClient
        numeFirma={numeFirma}
        creante={creante}
        incasari={incasariByCreanta}
        crossLinks={crossLinks}
      />
    </div>
  );
}
