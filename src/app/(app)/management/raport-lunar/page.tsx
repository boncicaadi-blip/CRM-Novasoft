import { getRaportLunar } from "@/lib/data/reports";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { RaportLunarClient } from "@/components/management/raport-lunar/RaportLunarClient";

export default async function RaportLunarPage() {
  await requireModuleAccess("management");

  const rows = await getRaportLunar(12);

  return <RaportLunarClient rows={rows} />;
}
