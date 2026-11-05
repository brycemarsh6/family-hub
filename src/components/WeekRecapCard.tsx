import { Check } from "lucide-react";
import { recapRangeLabel, type WeekRecap } from "@/lib/goalsRecap";

/** The Sunday card at the top of This week: how the week that just ended went. */
export function WeekRecapCard({ recap }: { recap: WeekRecap }) {
  return (
    <section className="mb-4 rounded-2xl bg-accent-soft p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Last week · {recapRangeLabel(recap.start, recap.end)}
      </h2>
      {recap.total > 0 && <p className="mt-1 text-lg font-bold tabular-nums">{recap.done} of {recap.total} done</p>}
      {recap.habits.length > 0 && (
        <ul className="mt-2">
          {recap.habits.map((habit, index) => (
            <li key={`${habit.title}-${index}`} className="flex min-h-11 items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {habit.title} {habit.count} of {habit.target}
              </span>
              {habit.met && <Check aria-label="Met" className="shrink-0 text-accent" size={18} />}
            </li>
          ))}
        </ul>
      )}
      {recap.measures.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {recap.measures.map((measure, index) => (
            <li key={`${measure.goalTitle}-${index}`}>
              {measure.goalTitle}: {measure.from} to {measure.to}
            </li>
          ))}
        </ul>
      )}
      {recap.stepsDone.length > 0 && (
        <p className="mt-2 text-sm">Steps finished: {recap.stepsDone.join(", ")}</p>
      )}
    </section>
  );
}
