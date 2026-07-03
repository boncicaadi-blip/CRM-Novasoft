import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOpportunity } from "@/lib/data/opportunities";
import { getTimeline } from "@/lib/data/timeline";
import { IstoricClient } from "@/components/overview/IstoricClient";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";

export default async function IstoricPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("crm");
  const { id } = await params;
  const [opportunity, timeline] = await Promise.all([getOpportunity(id), getTimeline(id)]);

  if (!opportunity) notFound();

  return (
    <div>
      <div className="px-3 pt-4 sm:px-6">
        <Link
          href={`/oportunitati/${id}`}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft size={13} />
          Inapoi la fisa oportunitatii
        </Link>
      </div>
      <IstoricClient opportunity={opportunity} timeline={timeline} />
    </div>
  );
}
