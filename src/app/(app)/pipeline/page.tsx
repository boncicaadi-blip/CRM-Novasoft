import { getOpportunities } from "@/lib/data/opportunities";
import { getAllNomenclatoare } from "@/lib/data/nomenclatoare";
import { PipelineView } from "@/components/pipeline/PipelineView";
import { STAGES } from "@/lib/constants";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";

export default async function PipelinePage() {
  await requireModuleAccess("crm", "pipeline");

  const [opportunities, allNomenclatoare] = await Promise.all([
    getOpportunities(),
    getAllNomenclatoare(),
  ]);

  // Coloanele Kanban trebuie sa includa TOATE stage-urile folosite de
  // oportunitati existente, chiar daca un stage a fost dezactivat ulterior
  // din Setari (dezactivat = nu mai apare ca optiune NOUA de ales, nu
  // inseamna ca oportunitatile deja aflate acolo dispar din Kanban).
  const stageRowsAll = allNomenclatoare
    .filter((n) => n.categorie === "stage")
    .sort((a, b) => a.ordine - b.ordine);
  const stages =
    stageRowsAll.length > 0 ? stageRowsAll.map((s) => s.valoare) : (STAGES as unknown as string[]);

  const stageColors: Record<string, string> = {};
  for (const s of stageRowsAll) {
    if (s.culoare) stageColors[s.valoare] = s.culoare;
  }

  return <PipelineView opportunities={opportunities} stages={stages} stageColors={stageColors} />;
}
