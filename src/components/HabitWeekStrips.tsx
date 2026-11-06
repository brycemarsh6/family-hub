"use client";

import { useState } from "react";
import { AvatarBadge } from "./AvatarBadge";
import { formatShortCalendarDate, parseDateParam } from "@/lib/householdDate";
import { STATS_WEEK_AXIS_MAX } from "@/lib/habitsStats";

type Person = { userId: string; displayName: string; avatarColor: string; counts: number[] };

/** Height in px of a full week (7 of 7); every strip shares it, so bars compare across people. */
const PLOT_HEIGHT = 72;

function weekLabel(day: string): string {
  const parsed = parseDateParam(day);
  return parsed ? formatShortCalendarDate(parsed) : day;
}

/**
 * Days done per week, one small strip per person (decision 104). Every bar is
 * the accent color, so a person is told apart by their badge and name, never
 * by a series color (avatar colors failed the chart color check). The strips
 * share one baseline height and one axis (0 to 7) and the same weeks. A week is
 * a 44px-wide tap column; tapping it writes the count as text under that
 * strip, so nothing depends on hover. The table above is the text alternative.
 */
export function HabitWeekStrips({ weeks, people }: { weeks: string[]; people: Person[] }) {
  const [picked, setPicked] = useState<{ userId: string; week: number } | null>(null);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-3">
      <p className="text-sm text-muted">Days done per week. Tap a week for its count.</p>
      {people.map((person) => {
        const caption = (week: number) => `${person.displayName}, week of ${weekLabel(weeks[week])}: ${person.counts[week]} of ${STATS_WEEK_AXIS_MAX}`;
        const open = picked?.userId === person.userId ? picked.week : null;
        return (
          <div key={person.userId} role="group" aria-label={`${person.displayName}, days done per week`}>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <AvatarBadge displayName={person.displayName} avatarColor={person.avatarColor} size={22} />
              {person.displayName}
            </div>
            <div className="flex gap-0.5">
              {weeks.map((week, index) => {
                const count = person.counts[index];
                const selected = open === index;
                return (
                  <button
                    key={week}
                    type="button"
                    aria-label={caption(index)}
                    aria-pressed={selected}
                    onClick={() => setPicked(selected ? null : { userId: person.userId, week: index })}
                    className={`flex w-11 flex-col items-center rounded-lg ${selected ? "bg-accent-soft" : ""}`}
                  >
                    <span className="flex items-end justify-center border-b border-line" style={{ height: PLOT_HEIGHT, width: "100%" }}>
                      {count > 0 && (
                        <span
                          aria-hidden="true"
                          className="w-3 rounded-t-[4px] bg-accent"
                          style={{ height: Math.round((Math.min(count, STATS_WEEK_AXIS_MAX) / STATS_WEEK_AXIS_MAX) * PLOT_HEIGHT) }}
                        />
                      )}
                    </span>
                    <span className="min-h-6 pt-1 text-xs text-muted">{weekLabel(week)}</span>
                  </button>
                );
              })}
            </div>
            <p aria-live="polite" className="mt-1 min-h-5 text-sm">
              {open !== null && caption(open)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
