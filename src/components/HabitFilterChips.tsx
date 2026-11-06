import { createElement } from "react";
import type { LucideIcon } from "lucide-react";

export type HabitFilterOption = { key: string; label: string; icon?: LucideIcon };

/**
 * The Today list's filter row: one chip lit at a time, the same markup as
 * Plans & Goals' This week chips (44px, pill, accent when pressed). It
 * scrolls sideways on a narrow phone rather than wrapping.
 */
export function HabitFilterChips({
  options,
  value,
  onChange,
}: {
  options: HabitFilterOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div role="group" aria-label="Filter the list" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
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
