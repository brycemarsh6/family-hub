import Link from "next/link";
import { Check } from "lucide-react";
import { HabitIcon } from "./HabitIcon";
import type { CalendarHabitDayView } from "@/lib/types";

/**
 * A planned habit day as a Schedule row card (decision 146): the habit's icon,
 * its title, and a check once it is done (struck through, muted). Opens the
 * habit's stats page. Same card shape as TaskCard so the two sit together.
 */
export function HabitDayCard({ item }: { item: CalendarHabitDayView }) {
  return (
    <Link
      href={`/habits/${item.habitId}`}
      aria-label={item.done ? `${item.title}, done` : item.title}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-line p-3 text-left"
    >
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center ${item.done ? "text-muted" : "text-fg"}`}
      >
        <HabitIcon name={item.icon} kind={item.kind} size={20} />
      </span>
      <p className={`min-w-0 flex-1 break-words text-base ${item.done ? "font-medium text-muted line-through" : "font-semibold text-fg"}`}>
        {item.title}
      </p>
      {item.done && <Check aria-hidden="true" size={20} className="shrink-0 text-accent" />}
    </Link>
  );
}
