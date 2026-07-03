import { getObligatiiByFurnizor, getObligatiiPlati } from "@/lib/data/obligatii";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { FisaFurnizorClient } from "@/components/obligatii/FisaFurnizorClient";

export default async function FisaFurnizorPage({
  params,
}: {
  params: Promise<{ nume: string }>;
}) {
  const { nume } = await params;
  const numeFurnizor = decodeURIComponent(nume);

  await requireModuleAccess("creante_obligatii");

  const [obligatii, platiByObligatie] = await Promise.all([
    getObligatiiByFurnizor(numeFurnizor),
    getObligatiiPlati(),
  ]);

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-2"><BackButton /></div>
      <FisaFurnizorClient
        numeFurnizor={numeFurnizor}
        obligatii={obligatii}
        plati={platiByObligatie}
      />
    </div>
  );
}
