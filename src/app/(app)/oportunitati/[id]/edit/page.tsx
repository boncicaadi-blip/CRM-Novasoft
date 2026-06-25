import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOpportunity, getProfiles } from "@/lib/data/opportunities";
import { OpportunityForm } from "@/components/form/OpportunityForm";

export default async function OpportunityEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [opportunity, profiles] = await Promise.all([
    getOpportunity(id),
    getProfiles(),
  ]);

  if (!opportunity) notFound();

  return (
    <div>
      <div className="border-b border-white/10 px-6 py-4">
        <Link
          href={`/oportunitati/${id}`}
          className="mb-1 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft size={13} />
          Inapoi la vedere de ansamblu
        </Link>
        <h1 className="text-lg font-heading text-white">
          Editeaza {opportunity.nume_potential}
        </h1>
      </div>
      <OpportunityForm opportunity={opportunity} profiles={profiles} />
    </div>
  );
}
