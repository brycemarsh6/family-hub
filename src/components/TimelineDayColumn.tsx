"use client";

// One day's own column inside TimelineGrid.tsx's hour rail — extracted out
// of that file wholesale (mission-18, CV5, contract C1) once mission-17/C6's
// own extraction (the all-day strip, into ./TimelineAllDayStrip.tsx) turned
// out not to be enough headroom on its own: C5's later growth of that strip
// pushed TimelineGrid.tsx to 649/650 total lines, one line under
// STRUCTURE.md's hard cap, which is what this contract exists to fix before
// the next change to that file has nowhere left to go. Behaviour-preserving
// only — every class name, inline style, and comment below is reproduced
// exactly as it read inside TimelineGrid.tsx's own `columnDays.map(...)`,
// not rewritten; see that file's own render body for the one thing that
// stayed there: the `<div className="relative">` gutter of 24 hour labels,
// which isn't per-day and so was never part of this seam.
//
// Renders, top to bottom, absolutely positioned inside its own
// `relative`-positioned column: the 24 hourly gridlines, every timed event
// as a real `<button>` (mission-17/C5's 44px-exception ruling, quoted
// below), and — only in today's own column, if present — the live now-line.
//
// DEPENDENCY INJECTION, same discipline as TimelineGrid.tsx's own header
// comment: this component owns no state and calls no hooks. `slots` (this
// day's own `TimelineColumnSlot<TimelineBlock>[]`, timelineLayout.ts's
// `assignColumns` output) and `eventById` (the SAME map the caller also
// hands to `./TimelineAllDayStrip.tsx`) both arrive fully computed — this
// file never calls `assignColumns` itself, so there's still exactly one
// call site, one per column, inside TimelineGrid.tsx (its own comment
// explains why that call happens per-column rather than once for the whole
// set: independent lane assignment is what lets a Fri 10 PM → Sat 2 AM
// event draw clipped halves on both days without them fighting over one
// shared column). `hoursPerDay`/`pxPerMinute` are passed rather than
// re-imported so this file never risks disagreeing with the caller's own
// `HOUR_HEIGHT_PX`/`MINUTES_PER_DAY`-derived constants — a second private
// copy of either is exactly the kind of drift this mission's own report
// (`GUTTER_WIDTH_PX`, `BOTTOM_NAV_HEIGHT_PX`) keeps finding.

import { minutesOfDay, MIN_BLOCK_MINUTES, type TimelineColumnSlot, type TimelineBlock } from "@/lib/timelineLayout";
import { formatTimeRange, isPast } from "@/lib/calendarDates";
import { avatarColorHex } from "@/lib/constants";
import { bandedBackground } from "@/lib/color";
import type { CalendarEventView } from "@/lib/types";

// `bandedBackground` (src/lib/color.ts, up to 3 diagonal bands — Month's
// own cap, EventCard.tsx's own comment for why THIS pill is capped tighter
// than EventCard's uncapped list version) used to be a private copy inside
// TimelineGrid.tsx named `blockBackground`, under a comment claiming it was
// "a private, minimal variant, not a copy." That claim was WRONG — Fury
// diffed it against MonthCell.tsx's own `pillBackground` and found the two
// byte-for-byte identical, only reachable because mission-17's C2/C3
// contracts put the two files in DIFFERENT boundaries, neither allowed to
// touch the other's. mission-17/C5 hoisted it into color.ts; see that
// file's own header for the fuller reasoning and why EventCard.tsx's
// `bandBackground` stays a genuinely separate function. `alpha`/opaque
// `var(--surface)` backdrop and the two alpha values used below (0.10 live
// / 0.05 past-or-done) are EventCard's own already-measured numbers
// (mission-8/Strange: worst case 4.64:1 light / 5.53:1 dark across all 8
// AVATAR_COLORS) — reusing the identical inputs is what makes reusing that
// finding valid here too, with no new contrast pass needed. mission-17/C6
// moved the all-day strip's own use of this function to
// `./TimelineAllDayStrip.tsx`; mission-18/C1 moved this timed-block use
// here, out of TimelineGrid.tsx, which is what makes this file — not that
// one — the place documenting it now.

type TimelineDayColumnProps = {
  day: Date;
  isToday: boolean;
  /** This day's own lane assignment — `columnSlots[columnIndex]` in the
   * caller, computed once per column via `assignColumns`, never here. */
  slots: TimelineColumnSlot<TimelineBlock>[];
  /** The SAME map `./TimelineAllDayStrip.tsx` also reads — one lookup
   * table, not two independently-built copies. */
  eventById: Map<string, CalendarEventView>;
  /** Real "now", not day-granular `today` — used both for the now-line's
   * position and for each block's own `isPast` check. */
  now: Date;
  hoursPerDay: number;
  pxPerMinute: number;
  /** 3 Day/Week (`columnDays.length > 1`) vs. Day — Day gets more detail
   * per block (D5); see the block-rendering section below. */
  compact: boolean;
  onOpenEvent: (event: CalendarEventView, day: Date) => void;
};

export function TimelineDayColumn({
  day,
  isToday,
  slots,
  eventById,
  now,
  hoursPerDay,
  pxPerMinute,
  compact,
  onOpenEvent,
}: TimelineDayColumnProps) {
  return (
    <div className="relative border-l border-line">
      {Array.from({ length: hoursPerDay }, (_, hour) => (
        <div
          key={hour}
          aria-hidden="true"
          className="absolute inset-x-0 border-t border-line/60"
          style={{ top: `calc(var(--hour-height) * ${hour})` }}
        />
      ))}

      {slots.map((slot) => {
        const event = eventById.get(slot.block.id);
        if (!event) return null; // defensive; every block came from `timed`/`eventById`
        const past = isPast(event.endAt, now); // real "now", not day-granular `today` — see above
        const colors = event.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
        // The library's own padded geometry — used for "is there
        // room for a second/third line" thresholds below, which
        // care about the box's real computed size, not the 2px
        // cosmetic trim applied only to what's actually drawn.
        const heightPx = slot.block.heightMinutes * pxPerMinute;
        // mission-17/C5, Strange B3: two consecutive half-hour
        // events measured a 0.0px gap between them — each one's
        // 24px hit band sharing an exact edge, so a ~12px aim
        // error opens the wrong one, which is worse than missing.
        // Drawing 2px SHORTER than the computed geometry (top
        // unchanged) is free and needs no `timelineLayout.ts`
        // change: `assignColumns` only guarantees non-overlap up
        // to exactly the padded box, so shrinking what's drawn can
        // never reintroduce an overlap the way inflating it could.
        const drawnHeightPx = Math.max(0, heightPx - 2);
        // The box's real duration is PADDED UP to
        // MIN_BLOCK_MINUTES by blockGeometry (timelineLayout.ts),
        // so a genuinely 15-minute event draws exactly like a
        // 30-minute one — the one case where the box's height is
        // not a fact about the event. `trueDurationMinutes` is the
        // event's OWN unpadded span, used only to force the time
        // line to show even when the drawn box is too short to
        // "earn" it on the usual height-based test below — a guess
        // (this box's height) must never stand in for a fact (how
        // long this really is) when the two disagree.
        const trueDurationMinutes = (event.endAt.getTime() - event.startAt.getTime()) / 60000;
        return (
          <button
            key={slot.block.id}
            type="button"
            onClick={() => onOpenEvent(event, day)}
            // D5 ("contrast by border, not alpha" — C7's Month-pill
            // ruling applies here too): the fill alone (0.05/0.10
            // alpha) measures under WCAG's 3:1 non-text floor by
            // itself, so a solid `border-fg`/`border-muted` carries
            // the real contrast, exactly MonthCell's own technique.
            //
            // 44px NOTE — Strange's ruling (mission-17, gate round
            // 1): "accept the height, reject the abutment." At this
            // file's HOUR_HEIGHT_PX (48, TimelineGrid.tsx), a
            // MIN_BLOCK_MINUTES (30 min, timelineLayout.ts) block
            // draws 30/60 * 48 = 24px tall — under DESIGN.md's 44px
            // floor. Inflating the box past its computed geometry
            // was rejected (it would either paint over a neighbor
            // or reintroduce the ambiguous tap the pad exists to
            // prevent, and doubling HOUR_HEIGHT_PX to clear 44px
            // outright would halve the visible day from 9.2 hours
            // to 4.6, paid on every open of the app's most-used
            // view). The exception carries a written boundary: a
            // timeline block's height is its duration; every block
            // stays a real `<button>` with a real accessible name;
            // Schedule (112px full-width rows) is the conforming
            // route for anyone who wants one. What the ruling did
            // NOT accept is the abutment between two such
            // blocks — see `drawnHeightPx` above for that fix.
            className={`absolute flex flex-col justify-start overflow-hidden rounded-md border px-1 text-left leading-tight ${
              past ? "border-muted text-muted" : "border-fg text-fg"
            }`}
            style={{
              top: `${slot.block.topMinutes * pxPerMinute}px`,
              height: `${drawnHeightPx}px`,
              left: `calc(${slot.column} / ${slot.columnCount} * 100%)`,
              // 2px narrower than the raw percentage split, for the
              // identical reason `drawnHeightPx` is 2px shorter —
              // a real gap between two side-by-side blocks in the
              // same overlap cluster, not just top-to-bottom ones.
              width: `calc(100% / ${slot.columnCount} - 2px)`,
              background: bandedBackground(colors, past ? 0.05 : 0.1),
            }}
          >
            {/* `<button>` elements are vertically centered by the
                browser's own default rendering UNLESS overridden
                (the same reason a short `<button>`'s text never
                looks top-aligned even with no CSS at all) — on a
                tall block that reads as WRONG: measured live, a
                144px 3-hour block put its title 59.7px down,
                reading as roughly 2:30 for an event that actually
                starts at 1:00. On an hour grid the box's TOP edge
                IS the start time, so its content must start there
                too. `flex flex-col justify-start` above overrides
                the default centering; `truncate` on each span
                still works under it since column-direction
                flex-shrink only touches the cross axis (height)
                here, not the width truncation depends on. */}
            <span className={`block truncate text-[10px] font-semibold ${compact ? "" : "text-xs"}`}>
              {event.title}
            </span>
            {/* Day view only (D5) — 3 Day/Week's ~44px columns get
                a colour band with 2-3 characters, same as the
                Month pill's own phone-width treatment; showing a
                time/location line there would just overflow
                illegibly. Gated on the block's own drawn height
                too, so a 30-min Day-view block (24px) doesn't try
                to cram two more text lines into a box shorter than
                one already is — UNLESS the event's real duration
                is itself under MIN_BLOCK_MINUTES, in which case the
                height is a pad, not a fact, and the time line is
                the only place the truth (a genuine 15-minute
                appointment, not 30) can still be told. */}
            {!compact && (heightPx >= 40 || trueDurationMinutes < MIN_BLOCK_MINUTES) && (
              <span className="block truncate text-[9px]">{formatTimeRange(event.startAt, event.endAt)}</span>
            )}
            {!compact && heightPx >= 72 && event.location && (
              <span className="block truncate text-[9px]">{event.location}</span>
            )}
          </button>
        );
      })}

      {isToday && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 z-10 flex items-center"
          style={{ top: `${minutesOfDay(now) * pxPerMinute}px` }}
        >
          <span className="h-2 w-2 -translate-x-1 rounded-full bg-danger" />
          <span className="h-px flex-1 bg-danger" />
        </div>
      )}
    </div>
  );
}
