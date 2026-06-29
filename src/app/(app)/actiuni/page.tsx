import { getOpportunities } from "@/lib/data/opportunities";
import { ActiuniClient } from "@/components/actiuni/ActiuniClient";

export default async function ActiuniPage() {
  const opportunities = await getOpportunities();
  return <ActiuniClient opportunities={opportunities} />;
}
