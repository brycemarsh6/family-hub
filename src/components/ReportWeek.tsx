import { HabitDayCell } from "./HabitDayCell";
import { ReportItemHead } from "./ReportItemHead";
import type { HabitReport, ReportWeekRow } from "@/lib/habitsReport";

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * The Week view (decision 166): one S M T W T F S header row, then a card per
 * item under Habits and Chores. The seven cells are read-only spans, so a
 * parent reading a kid's week cannot tick for them by accident; back-filling
 * stays on the stats page.
 */
export function ReportWeek({ sections, today }: { sections: HabitReport["sections"]; today: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div aria-hidden="true" className="grid grid-cols-7 gap-0.5 px-[7px]">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <span key={index} className="text-center text-xs font-semibold text-muted">
            {letter}
          </span>
        ))}
      </div>
      {sections.map((section) => (
        <section key={section.kind} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{section.title}</h2>
          {(section.rows as ReportWeekRow[]).map((row) => (
            <div key={row.id} className="rounded-2xl border border-line bg-surface p-1.5">
              <ReportItemHead item={row} count={row.count} />
              <div className="grid grid-cols-7 gap-0.5">
                {row.cells.map((cell) => (
                  <HabitDayCell key={cell.day} cell={cell} today={today} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
