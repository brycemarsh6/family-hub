"use client";

import { HabitIcon } from "./HabitIcon";
import { HABIT_ICONS, type HabitKind } from "@/lib/habitVocabulary";

/**
 * The icon grid: every name on the allow-list as a 48px tile. The picked tile
 * is outlined in the accent; tapping it again clears the pick (the kind's
 * default icon is used then). The caller owns the state.
 */
export function HabitIconPicker({
  value,
  kind,
  onChange,
}: {
  value: string | null;
  kind: HabitKind;
  onChange: (next: string | null) => void;
}) {
  return (
    <div role="group" aria-label="Icon" className="flex flex-wrap gap-2">
      {HABIT_ICONS.map((name) => {
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={selected}
            aria-label={`${name} icon`}
            onClick={() => onChange(selected ? null : name)}
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-accent transition-colors ${
              selected ? "border-2 border-accent bg-accent-soft" : "border border-line bg-surface"
            }`}
          >
            <HabitIcon name={name} kind={kind} />
          </button>
        );
      })}
    </div>
  );
}
