import { getCompanySettings } from "@/lib/data/settings";
import { TargetComercialForm } from "@/components/setari/TargetComercialForm";

export default async function SetariComercialPage() {
  const settings = await getCompanySettings();

  return (
    <div className="px-3 py-4 sm:px-6">
      <h1 className="text-lg font-heading text-white">Comercial</h1>
      <p className="mb-5 text-sm text-slate-500">
        Setari folosite in Raportul Comercial (Pipeline Coverage si alte KPI-uri de business).
      </p>
      <TargetComercialForm initialValue={settings.targetComercial} />
    </div>
  );
}
