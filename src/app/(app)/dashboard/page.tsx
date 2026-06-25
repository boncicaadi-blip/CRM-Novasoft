import { TrendingUp, Target, Trophy, XCircle } from "lucide-react";
import { getOpportunities, getAllHistory } from "@/lib/data/opportunities";
import {
  computeKpis,
  groupByStage,
  groupByStatus,
  groupByResponsabil,
  buildTimeSeries,
  upcomingActions,
} from "@/lib/analytics";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StageChart } from "@/components/dashboard/StageChart";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { TimeSeriesChart } from "@/components/dashboard/TimeSeriesChart";
import { ResponsabilChart } from "@/components/dashboard/ResponsabilChart";
import { ActionsList } from "@/components/dashboard/ActionsList";

const currency = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 });

export default async function DashboardPage() {
  const [opportunities, history] = await Promise.all([
    getOpportunities(),
    getAllHistory(),
  ]);

  const kpis = computeKpis(opportunities);
  const stageData = groupByStage(opportunities);
  const statusData = groupByStatus(opportunities);
  const responsabilData = groupByResponsabil(opportunities);
  const timeSeries = buildTimeSeries(history);
  const actions = upcomingActions(opportunities);

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Privire de ansamblu asupra pipeline-ului comercial.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-4">
        <KpiCard
          label="ARR activ"
          value={`${currency.format(kpis.totalArr)} lei`}
          sublabel={`${kpis.activeCount} oportunitati active`}
          icon={<TrendingUp size={16} />}
        />
        <KpiCard
          label="Forecast ponderat"
          value={`${currency.format(kpis.weightedForecast)} lei`}
          sublabel="ARR x Probability"
          icon={<Target size={16} />}
        />
        <KpiCard
          label="Castigate"
          value={String(kpis.wonCount)}
          sublabel={`Win rate: ${(kpis.winRate * 100).toFixed(0)}%`}
          icon={<Trophy size={16} />}
          accent="#22C55E"
        />
        <KpiCard
          label="Pierdute"
          value={String(kpis.lostCount)}
          sublabel={`din ${kpis.totalOpportunities} total`}
          icon={<XCircle size={16} />}
          accent="#EF4444"
        />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <StageChart data={stageData} />
        </div>
        <StatusChart data={statusData} />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <TimeSeriesChart data={timeSeries} />
        </div>
        <ActionsList actions={actions} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ResponsabilChart data={responsabilData} />
      </div>
    </div>
  );
}
