import { createElement } from "react";
import { Moon, Sun, Sunset, type LucideIcon } from "lucide-react";
import { lifeAreaInfo, toLifeArea } from "@/lib/goalVocabulary";
import { TIMES_OF_DAY, TIME_OF_DAY_LABELS } from "@/lib/habitVocabulary";

export type HabitFilterOption = { key: string; label: string; icon?: LucideIcon };

/** The icon for each time of day, wherever a filter offers one. */
export const TIME_ICONS = { morning: Sun, afternoon: Sunset, evening: Moon } as const;

export const ALL_FILTER = "all";

/** Which chips to offer: only the times of day and life areas that rows actually use (Today and the wide family view share this). */
export function buildFilterOptions(rows: readonly { timeOfDay: string | null; lifeArea: string | null }[]): HabitFilterOption[] {
  const options: HabitFilterOption[] = [{ key: ALL_FILTER, label: "All" }];
  for (const time of TIMES_OF_DAY) {
    if (rows.some((row) => row.timeOfDay === time)) {
      options.push({ key: `time:${time}`, label: TIME_OF_DAY_LABELS[time], icon: TIME_ICONS[time] });
    }
  }
  const areas = new Set<string>();
  for (const row of rows) {
    const area = toLifeArea(row.lifeArea);
    if (area) areas.add(area);
  }
  for (const area of areas) options.push({ key: `area:${area}`, label: lifeAreaInfo(toLifeArea(area)!).short });
  return options;
}

/** If the chosen chip's last row went away (the server refreshed), show everything again. */
export function activeFilter(options: readonly HabitFilterOption[], filter: string): string {
  return options.some((option) => option.key === filter) ? filter : ALL_FILTER;
}

/** Whether a row passes the lit chip. */
export function matchesFilter(row: { timeOfDay: string | null; lifeArea: string | null }, active: string): boolean {
  if (active === ALL_FILTER) return true;
  return active.startsWith("time:") ? `time:${row.timeOfDay}` === active : `area:${row.lifeArea}` === active;
}

/**
 * The Today list's filter row: one chip lit at a time, the same markup as
 * Plans & Goals' This week chips (44px, pill, accent when pressed). It
 * scrolls sideways on a narrow phone rather than wrapping.
 */
export function HabitFilterChips({
  options,
  value,
  onChange,
  className = "mb-4",
}: {
  options: HabitFilterOption[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Filter the list" className={`-mx-1 flex gap-2 overflow-x-auto px-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          aria-pressed={value === option.key}
          className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
            value === option.key ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-muted"
          }`}
        >
          {option.icon && createElement(option.icon, { "aria-hidden": true, size: 16 })}
          {option.label}
        </button>
      ))}
    </div>
  );
}
