import { getTargeteComercialeAnuale } from "@/lib/data/settings";
import { TargetComercialForm } from "@/components/setari/TargetComercialForm";

export default async function SetariComercialPage() {
  const targete = await getTargeteComercialeAnuale();

  return (
    <div className="px-3 py-4 sm:px-6">
      <h1 className="text-lg font-heading text-text-primary">Comercial</h1>
      <p className="mb-5 text-sm text-text-muted">
        Setari folosite in Raportul Comercial (Pipeline Coverage si alte KPI-uri de business).
      </p>
      <TargetComercialForm targete={targete} />
    </div>
  );
}
