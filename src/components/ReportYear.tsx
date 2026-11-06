import { HabitMonthCalendar } from "./HabitMonthCalendar";
import { ReportItemChooser } from "./ReportItemChooser";
import type { HabitReport } from "@/lib/habitsReport";

type YearData = NonNullable<HabitReport["year"]>;

/**
 * The Year view (decision 168): the "Which item?" button, then the chosen
 * item's twelve compact month grids (two across on a phone) and the totals
 * line. `choiceHrefs` maps each item's id to its address.
 */
export function ReportYear({ year, today, choiceHrefs }: { year: YearData; today: string; choiceHrefs: Record<string, string> }) {
  if (!year.chosenId) return null;
  return (
    <>
      <ReportItemChooser choices={year.choices.map((choice) => ({ ...choice, href: choiceHrefs[choice.id] }))} chosenId={year.chosenId} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {year.months.map((month) => (
          <section key={month.month} className="rounded-2xl border border-line bg-surface p-1.5">
            <h2 className="mb-1 px-0.5 text-sm font-semibold">{month.name}</h2>
            <HabitMonthCalendar cells={month.cells} leading={month.leading} today={today} compact />
          </section>
        ))}
      </div>
      {year.totals && <p className="mt-3 text-sm text-muted">{year.totals}</p>}
    </>
  );
}
