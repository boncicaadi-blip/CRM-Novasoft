import { getOpportunities } from "@/lib/data/opportunities";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { PipelineView } from "@/components/pipeline/PipelineView";
import { STAGES } from "@/lib/constants";

export default async function PipelinePage() {
  const [opportunities, nomenclatoare] = await Promise.all([
    getOpportunities(),
    getNomenclatoare(),
  ]);

  const stageRows = nomenclatoare["stage"] ?? [];
  const stages = stageRows.length > 0 ? stageRows.map((s) => s.valoare) : (STAGES as unknown as string[]);
  const stageColors: Record<string, string> = {};
  for (const s of stageRows) {
    if (s.culoare) stageColors[s.valoare] = s.culoare;
  }

  return <PipelineView opportunities={opportunities} stages={stages} stageColors={stageColors} />;
}
