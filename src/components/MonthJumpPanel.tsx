"use client";

import { useState } from "react";
import { MiniMonth } from "./MiniMonth";
import { MonthChips } from "./MonthChips";
import { PagedSwipeArea } from "./PagedTrack";

// Mission 72: the panel the Calendar title opens. Month chips on top and,
// unless `chipsOnly` (Month and Year already show a big month), a little
// month below that swipes sideways. Mounted only while open, so its root
// carrying `data-month-panel={beside ? "open" : undefined}` is the one signal the app chrome reads.
// The shown month is local: chips and swipes only reframe this little month,
// and only tapping a day navigates (on Month and Year, a chip does).
function shiftMonth(month: Date, offset: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + offset, 1);
}

export function MonthJumpPanel({
  anchor,
  today,
  selected,
  dotDays,
  chipsOnly,
  beside,
  onPickDay,
  onPickMonth,
}: {
  anchor: Date;
  today: Date;
  selected: Date | null;
  dotDays: ReadonlySet<string>;
  chipsOnly: boolean;
  /** Sitting beside the view (not above it): the only time the chrome squeezes to the rail. */
  beside: boolean;
  onPickDay: (day: Date) => void;
  /** Chips only: a chip tap navigates (Month: that month; Year: the year of that month's 1st). */
  onPickMonth: (firstOfMonth: Date) => void;
}) {
  const [shown, setShown] = useState(() => shiftMonth(anchor, 0));
  // The little month follows the calendar: when the anchor's month changes
  // (Today, a swipe, another view) it reframes to it. Set during render, the
  // documented way to reset state from a changing prop.
  const anchorMonth = anchor.getFullYear() * 12 + anchor.getMonth();
  const [seenAnchorMonth, setSeenAnchorMonth] = useState(anchorMonth);
  if (seenAnchorMonth !== anchorMonth) {
    setSeenAnchorMonth(anchorMonth);
    setShown(shiftMonth(anchor, 0));
  }
  const page = (month: Date) => (
    <MiniMonth month={month} today={today} selected={selected} dotDays={dotDays} onPickDay={onPickDay} />
  );

  return (
    <div data-month-panel={beside ? "open" : undefined} className="pt-1">
      <MonthChips anchor={chipsOnly ? anchor : shown} onPickMonth={chipsOnly ? onPickMonth : setShown} />
      {!chipsOnly && (
        <PagedSwipeArea
          onTurn={(direction) => setShown(shiftMonth(shown, direction))}
          pageKey={shown.getFullYear() * 12 + shown.getMonth()}
          previous={page(shiftMonth(shown, -1))}
          current={page(shown)}
          next={page(shiftMonth(shown, 1))}
        />
      )}
    </div>
  );
}
