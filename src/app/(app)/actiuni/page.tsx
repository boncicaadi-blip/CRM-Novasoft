import { getOpportunities } from "@/lib/data/opportunities";
import { ActiuniClient } from "@/components/actiuni/ActiuniClient";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import type { ActionWorkItemFilter } from "@/lib/analytics";

const VALID_FILTERS: ActionWorkItemFilter[] = [
  "azi",
  "intarziate",
  "saptamana",
  "fara_next_step",
  "finalizate",
];

export default async function ActiuniPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireModuleAccess("crm");

  const opportunities = await getOpportunities();
  const { filter } = await searchParams;
  const initialFilter = VALID_FILTERS.includes(filter as ActionWorkItemFilter)
    ? (filter as ActionWorkItemFilter)
    : undefined;

  return <ActiuniClient opportunities={opportunities} initialFilter={initialFilter} />;
}
