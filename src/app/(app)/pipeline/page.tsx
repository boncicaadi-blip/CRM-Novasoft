import { getOpportunities } from "@/lib/data/opportunities";
import { getColorMaps } from "@/lib/data/nomenclatoare";
import { PipelineView } from "@/components/pipeline/PipelineView";

export default async function PipelinePage() {
  const [opportunities, colors] = await Promise.all([getOpportunities(), getColorMaps()]);
  return <PipelineView opportunities={opportunities} stageColors={colors.stageColors} />;
}
