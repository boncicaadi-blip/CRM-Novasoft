import { getRaportLunar } from "@/lib/data/reports";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { RaportLunarClient } from "@/components/rapoarte/RaportLunarClient";

export default async function RaportLunarPage() {
  await requireModuleAccess("crm", "raport_comercial_lunar");

  const rows = await getRaportLunar(12);

  return <RaportLunarClient rows={rows} />;
}
