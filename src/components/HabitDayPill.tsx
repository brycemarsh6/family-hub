import Link from "next/link";
import { HabitIcon } from "./HabitIcon";
import type { CalendarHabitDayView } from "@/lib/types";

// A planned habit day as a one-line pill in the all-day strip (decision 146).
// It opens the habit's page. `gridColumn` / `gridRow` place it in the strip's grid.
export function HabitDayPill({ habitDay, gridColumn, gridRow }: { habitDay: CalendarHabitDayView; gridColumn: string; gridRow: number }) {
  return (
    <Link
      href={`/habits/${habitDay.habitId}`}
      aria-label={habitDay.done ? `${habitDay.title}, done` : habitDay.title}
      className={`flex items-center gap-0.5 truncate rounded border px-1 text-left text-[9px] font-semibold leading-[24px] ${
        habitDay.done ? "border-muted text-muted" : "border-fg text-fg"
      }`}
      style={{ gridColumn, gridRow, background: "var(--surface-2)" }}
    >
      <span aria-hidden="true" className="flex shrink-0">
        <HabitIcon name={habitDay.icon} kind={habitDay.kind} size={10} />
      </span>
      {habitDay.done && (
        <span aria-hidden="true" className="shrink-0">
          ✓
        </span>
      )}
      <span className={`truncate ${habitDay.done ? "line-through" : ""}`}>{habitDay.title}</span>
    </Link>
  );
}
