import { redirect } from "next/navigation";
import { getRegistruContracte, getUrmatorulNumarContract } from "@/lib/data/registru-contracte";
import { getPartnersPentruContracte } from "@/lib/data/contracte";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { RegistruContracteClient } from "@/components/contracte/RegistruContracteClient";

export default async function RegistruContractePage() {
  const { role } = await requireModuleAccess("contracte", "registru");
  if (role === "viewer") redirect("/contracte/generate");

  const [inregistrari, parteneri, nomenclatoare, urmatorClient, urmatorFurnizor] = await Promise.all([
    getRegistruContracte(),
    getPartnersPentruContracte(),
    getNomenclatoare(),
    getUrmatorulNumarContract("client"),
    getUrmatorulNumarContract("furnizor"),
  ]);

  return (
    <RegistruContracteClient
      inregistrari={inregistrari}
      parteneri={parteneri}
      produseServicii={nomenclatoare["produs_serviciu"] ?? []}
      tipuriServiciu={nomenclatoare["venit_serviciu"] ?? []}
      urmatorNrClient={urmatorClient}
      urmatorNrFurnizor={urmatorFurnizor}
    />
  );
}
