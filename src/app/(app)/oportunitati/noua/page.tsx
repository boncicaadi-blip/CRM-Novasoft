import { getProfiles } from "@/lib/data/opportunities";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { OpportunityForm } from "@/components/form/OpportunityForm";
import { BackButton } from "@/components/BackButton";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";

export default async function NewOpportunityPage() {
  await requireModuleAccess("crm");

  const [profiles, nomenclatoare] = await Promise.all([getProfiles(), getNomenclatoare()]);

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-4 sm:px-6">
        <BackButton />
        <div>
          <h1 className="text-lg font-heading text-white">Oportunitate noua</h1>
          <p className="text-sm text-slate-500">Completeaza pasii de mai jos.</p>
        </div>
      </div>
      <OpportunityForm profiles={profiles} nomenclatoare={nomenclatoare} />
    </div>
  );
}
