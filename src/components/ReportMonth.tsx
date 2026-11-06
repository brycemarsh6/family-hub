import { HabitMonthCalendar } from "./HabitMonthCalendar";
import { ReportItemHead } from "./ReportItemHead";
import type { HabitReport, ReportMonthCard } from "@/lib/habitsReport";

/**
 * The Month view (decision 167): a card per item under Habits and Chores, the
 * cards auto-filling at a 160px minimum (a lone card keeps its width) (two across on a phone), each with the
 * compact read-only calendar. The page's one legend sits under the pager.
 */
export function ReportMonth({ sections, today }: { sections: HabitReport["sections"]; today: string }) {
  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <section key={section.kind} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{section.title}</h2>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {(section.rows as ReportMonthCard[]).map((card) => (
              <div key={card.id} className="rounded-2xl border border-line bg-surface p-1.5">
                <ReportItemHead item={card} count={card.count} stacked />
                <HabitMonthCalendar cells={card.cells} leading={card.leading} today={today} compact />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
