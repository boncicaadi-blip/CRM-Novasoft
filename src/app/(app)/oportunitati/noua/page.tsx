import { getProfiles } from "@/lib/data/opportunities";
import { OpportunityForm } from "@/components/form/OpportunityForm";

export default async function NewOpportunityPage() {
  const profiles = await getProfiles();

  return (
    <div>
      <div className="border-b border-white/10 px-6 py-4">
        <h1 className="text-lg font-semibold text-white">Oportunitate noua</h1>
        <p className="text-sm text-slate-500">Completeaza pasii de mai jos.</p>
      </div>
      <OpportunityForm profiles={profiles} />
    </div>
  );
}
