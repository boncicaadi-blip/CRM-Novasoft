import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOpportunity, getProfiles } from "@/lib/data/opportunities";
import { OpportunityForm } from "@/components/form/OpportunityForm";
import { STAGE_COLORS, STATUS_COLORS } from "@/lib/constants";
import { DeleteButton } from "@/components/DeleteButton";

export default async function OpportunityDetailPage({
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
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <Link
            href="/pipeline"
            className="mb-1 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
          >
            <ArrowLeft size={13} />
            Inapoi la pipeline
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">{opportunity.nume_potential}</h1>
            <span className="font-mono text-xs text-slate-500">{opportunity.opportunity_code}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: `${STAGE_COLORS[opportunity.stage]}20`,
                color: STAGE_COLORS[opportunity.stage],
              }}
            >
              {opportunity.stage}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: `${STATUS_COLORS[opportunity.status]}20`,
                color: STATUS_COLORS[opportunity.status],
              }}
            >
              {opportunity.status}
            </span>
          </div>
        </div>
        <DeleteButton id={opportunity.id} />
      </div>
      <OpportunityForm opportunity={opportunity} profiles={profiles} />
    </div>
  );
}
