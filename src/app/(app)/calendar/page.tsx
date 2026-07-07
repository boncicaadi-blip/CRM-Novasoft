import { getOpportunities, getProfiles } from "@/lib/data/opportunities";
import { buildCalendarActions, calendarActionCounts } from "@/lib/analytics";
import { CalendarKpis } from "@/components/calendar/CalendarKpis";
import { ActionsCalendar } from "@/components/calendar/ActionsCalendar";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { BackButton } from "@/components/BackButton";

export default async function CalendarPage() {
  await requireModuleAccess("crm");

  const [opportunities, profiles] = await Promise.all([getOpportunities(), getProfiles()]);
  const actions = buildCalendarActions(opportunities);
  const counts = calendarActionCounts(opportunities);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden md:h-screen">
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-4 sm:px-6">
        <BackButton />
        <div>
          <h1 className="text-lg font-heading text-white">Calendar actiuni</h1>
          <p className="text-sm text-slate-500">
            Toate actiunile planificate, vazute pe luna calendaristica.
          </p>
        </div>
      </div>
      <CalendarKpis today={counts.today} overdue={counts.overdue} upcoming={counts.upcoming} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <ActionsCalendar actions={actions} profiles={profiles} />
      </div>
    </div>
  );
}
