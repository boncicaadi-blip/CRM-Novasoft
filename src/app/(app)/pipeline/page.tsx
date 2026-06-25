import { getOpportunities } from "@/lib/data/opportunities";
import { PipelineView } from "@/components/pipeline/PipelineView";

export default async function PipelinePage() {
  const opportunities = await getOpportunities();
  return <PipelineView opportunities={opportunities} />;
}
