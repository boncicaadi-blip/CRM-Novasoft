import { redirect } from "next/navigation";
import { getContractDrafturi, getPartnersPentruContracte } from "@/lib/data/contracte";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { ContractDrafturiClient } from "@/components/contracte/ContractDrafturiClient";

export default async function ContractDrafturiPage() {
  const { role } = await requireModuleAccess("contracte", "drafturi");
  if (role === "viewer") redirect("/contracte/generate");

  const [drafturi, nomenclatoare, parteneri] = await Promise.all([
    getContractDrafturi(),
    getNomenclatoare(),
    getPartnersPentruContracte(),
  ]);
  const produseServicii = nomenclatoare["produs_serviciu"] ?? [];
  const tipuriContract = nomenclatoare["venit_serviciu"] ?? [];

  return (
    <ContractDrafturiClient
      drafturi={drafturi}
      produseServicii={produseServicii}
      tipuriContract={tipuriContract}
      parteneri={parteneri}
    />
  );
}
