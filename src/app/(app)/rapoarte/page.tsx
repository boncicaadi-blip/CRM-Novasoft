import { getOpportunities } from "@/lib/data/opportunities";
import { getCompanySettings } from "@/lib/data/settings";
import { getPipelineSnapshotAt } from "@/lib/data/reports";
import { computePipelineReportKpis } from "@/lib/analytics";
import { RaportComercialClient } from "@/components/rapoarte/RaportComercialClient";

export default async function RaportComercialPage() {
  const oSaptamanaInUrma = new Date();
  oSaptamanaInUrma.setDate(oSaptamanaInUrma.getDate() - 7);

  const [opportunities, settings, previousWeek] = await Promise.all([
    getOpportunities(),
    getCompanySettings(),
    getPipelineSnapshotAt(oSaptamanaInUrma),
  ]);

  const current = computePipelineReportKpis(opportunities);

  return (
    <RaportComercialClient
      current={current}
      previousWeek={previousWeek}
      targetComercial={settings.targetComercial}
    />
  );
}
