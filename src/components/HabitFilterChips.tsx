import { createElement } from "react";
import { Moon, Sun, Sunset, type LucideIcon } from "lucide-react";

export type HabitFilterOption = { key: string; label: string; icon?: LucideIcon };

/** The icon for each time of day, wherever a filter offers one. */
export const TIME_ICONS = { morning: Sun, afternoon: Sunset, evening: Moon } as const;

/** The shared filter options (`reportFilterOptions`, `kinds: false`) with the time-of-day icons attached. */
export function withTimeIcons(options: readonly { key: string; label: string }[]): HabitFilterOption[] {
  return options.map(({ key, label }) => {
    const time = key.startsWith("time:") ? (key.slice(5) as keyof typeof TIME_ICONS) : null;
    return { key, label, icon: time ? TIME_ICONS[time] : undefined };
  });
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
