import { notFound } from "next/navigation";
import { getPartnerDetail } from "@/lib/data/partener-fisa";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { getContractePartener } from "@/lib/data/contracte";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";
import { PartnerFisaClient } from "@/components/parteneri/PartnerFisaClient";

export default async function PartenerFisaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("crm", "parteneri");
  const { id } = await params;

  const [partner, nomenclatoare, contracte] = await Promise.all([
    getPartnerDetail(id),
    getNomenclatoare(),
    getContractePartener(id),
  ]);

  if (!partner) notFound();

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-2">
        <BackButton />
      </div>
      <PartnerFisaClient partner={partner} domeniiActivitate={nomenclatoare["domeniu_activitate"] ?? []} contracte={contracte} />
    </div>
  );
}
