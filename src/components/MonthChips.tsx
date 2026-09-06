"use client";

import { useEffect, useRef } from "react";
import { isSameMonth } from "@/lib/mealPlanDates";

/**
 * A horizontal scroller of month names, mounted above the Month grid
 * (`CalendarViews.tsx`'s `"month"` renderer branch — mission-18/C3). Tapping
 * a month calls back with that month's 1st.
 *
 * Deliberately generic over just an anchor and a callback — no Month-
 * specific prop, no read of `CalendarViews.tsx`'s own state — because CV6
 * (calendar-v2.md) reuses this exact component inside its month-picker
 * dropdown, on every view, not only Month. `onPickMonth`, not `onPick`:
 * `CalendarHeader` already has an `onPickView` for the view switcher, and
 * two near-identical names on one screen is how a later reader wires the
 * wrong one (this contract's own brief, verbatim).
 */
export type MonthChipsProps = {
  /** Any real day inside the month to highlight as selected — typically
   * the Month view's own `anchor`. Only its year/month are read. */
  anchor: Date;
  /** Called with the 1st of the tapped month. */
  onPickMonth: (firstOfMonth: Date) => void;
};

/** How many months to show on each side of `anchor`'s own month. 12 each
 * way (25 chips total) comfortably spans more than one January in either
 * direction without building a virtualized/infinite scroller — this is a
 * plain scrollable strip, not a long list, and CV6 needs no wider a range
 * to seed its dropdown with. */
const MONTHS_BEFORE = 12;
const MONTHS_AFTER = 12;

const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short" });

/** The 1st of the month `offset` calendar months from `anchor`'s own month
 * — calendar-component arithmetic only (never milliseconds), matching
 * every other date helper in this codebase. `Date`'s constructor
 * normalizes an out-of-range month index by rolling the year, so no
 * separate December/January handling is needed here — the same trick
 * `useCalendarPeriod.ts`'s own `monthAnchor` relies on. There's no shared
 * "add N months" helper in `src/lib/` to import instead (`mealPlanDates.ts`
 * only has `addDays`), and generalizing one for this single caller is
 * outside this contract's boundary — a five-line local copy, same call as
 * `calendarViewConfig.ts`'s own `formatThreeDayRange`. */
function monthStart(anchor: Date, offset: number): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
}

export function MonthChips({ anchor, onPickMonth }: MonthChipsProps) {
  const months: Date[] = [];
  for (let offset = -MONTHS_BEFORE; offset <= MONTHS_AFTER; offset++) {
    months.push(monthStart(anchor, offset));
  }

  const selectedRef = useRef<HTMLButtonElement | null>(null);

  // Recentres the strip on whichever chip is selected — on mount, and again
  // whenever the selected MONTH actually changes (paging, Today, a tap
  // here). Keyed on the calendar fields themselves, not the `anchor` object
  // reference: `anchor` is a freshly-constructed `Date` most renders (Day/
  // Week paging moves it daily even though Month chips only care about the
  // month), so keying on the object would re-scroll on every keystroke of
  // unrelated navigation. "instant", not "smooth" — the same call CLAUDE.md
  // already settled for the Recipes A–Z rail: a strip meant to snap to
  // wherever the user just tapped shouldn't queue a competing animation.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor.getFullYear(), anchor.getMonth()]);

  return (
    <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2">
        {months.map((month) => {
          const selected = isSameMonth(month, anchor);
          // The year is shown once at each January, per the contract — every
          // other chip is a bare month name. A 25-chip strip spans at least
          // one, usually two, January boundaries, so the year never goes
          // more than ~12 chips without being restated.
          const label =
            month.getMonth() === 0
              ? `${MONTH_NAME_FORMATTER.format(month)} ${month.getFullYear()}`
              : MONTH_NAME_FORMATTER.format(month);
          return (
            <button
              key={`${month.getFullYear()}-${month.getMonth()}`}
              ref={selected ? selectedRef : undefined}
              type="button"
              onClick={() => onPickMonth(month)}
              aria-pressed={selected}
              className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                selected
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-line bg-surface text-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
