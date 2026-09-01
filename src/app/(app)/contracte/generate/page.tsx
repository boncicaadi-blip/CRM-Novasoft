import { getContracteGenerate, getContractDrafturi, getPartnersPentruContracte, getContractSignedUrl } from "@/lib/data/contracte";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { ContracteGenerateClient } from "@/components/contracte/ContracteGenerateClient";

export default async function ContracteGeneratePage() {
  await requireModuleAccess("contracte", "generate");

  const [contracte, drafturi, parteneri, nomenclatoare] = await Promise.all([
    getContracteGenerate(),
    getContractDrafturi(),
    getPartnersPentruContracte(),
    getNomenclatoare(),
  ]);
  const tipuriContract = nomenclatoare["venit_serviciu"] ?? [];

  const randuri = await Promise.all(
    contracte.map(async (c) => {
      const draft = drafturi.find((d) => d.id === c.draft_id);
      const tip = tipuriContract.find((t) => t.id === draft?.tip_contract_id);
      const downloadUrl = await getContractSignedUrl(c.storage_path);
      return { contract: c, draftNume: draft?.nume ?? null, tipNume: tip?.valoare ?? null, downloadUrl };
    })
  );

  return <ContracteGenerateClient randuri={randuri} parteneri={parteneri} />;
}
