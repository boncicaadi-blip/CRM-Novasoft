import { getOpportunities } from "@/lib/data/opportunities";
import { buildCalendarActions, calendarActionCounts } from "@/lib/analytics";
import { CalendarKpis } from "@/components/calendar/CalendarKpis";
import { ActionsCalendar } from "@/components/calendar/ActionsCalendar";

export default async function CalendarPage() {
  const opportunities = await getOpportunities();
  const actions = buildCalendarActions(opportunities);
  const counts = calendarActionCounts(actions);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-6 py-4">
        <h1 className="text-lg font-heading text-white">Calendar actiuni</h1>
        <p className="text-sm text-slate-500">
          Toate actiunile planificate, vazute pe luna calendaristica.
        </p>
      </div>
      <CalendarKpis today={counts.today} overdue={counts.overdue} upcoming={counts.upcoming} />
      <div className="flex-1 overflow-y-auto">
        <ActionsCalendar actions={actions} />
      </div>
    </div>
  );
}
