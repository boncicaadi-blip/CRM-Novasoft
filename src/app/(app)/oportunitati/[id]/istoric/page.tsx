import { notFound } from "next/navigation";
import { getOpportunity } from "@/lib/data/opportunities";
import { getTimeline } from "@/lib/data/timeline";
import { IstoricClient } from "@/components/overview/IstoricClient";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackLink } from "@/components/BackLink";

export default async function IstoricPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("crm");
  const { id } = await params;
  const [opportunity, timeline] = await Promise.all([getOpportunity(id), getTimeline(id)]);

  if (!opportunity) notFound();

  return (
    <div>
      <div className="px-3 pt-4 sm:px-6">
        <BackLink label="Inapoi la fisa oportunitatii" />
      </div>
      <IstoricClient opportunity={opportunity} timeline={timeline} />
    </div>
  );
}
