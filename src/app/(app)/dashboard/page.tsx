import { getOpportunities, getAllHistory } from "@/lib/data/opportunities";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const [opportunities, history] = await Promise.all([
    getOpportunities(),
    getAllHistory(),
  ]);

  return <DashboardClient opportunities={opportunities} history={history} />;
}
