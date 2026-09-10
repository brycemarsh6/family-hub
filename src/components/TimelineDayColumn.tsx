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

import {
  minutesOfDay,
  MIN_BLOCK_MINUTES,
  blockGeometry,
  type TimelineColumnSlot,
  type TimelineBlock,
} from "@/lib/timelineLayout";
import { formatTimeRange, isPast } from "@/lib/calendarDates";
import { avatarColorHex } from "@/lib/constants";
import { bandedBackground } from "@/lib/color";
import type { LongPressDragHandlers } from "@/lib/useLongPressDrag";
import type { CalendarEventView } from "@/lib/types";

// mission-20 (CD1)/C5 — everything CalendarViews.tsx's own `onDragEnd` needs
// to resolve a FINISHED drag into a new start time and day, built entirely
// from data already known right here, per block, at the moment the drag
// begins — no second lookup back into `timelineLayout.ts`'s slots or
// `TimelineGrid.tsx`'s `columnDays` once the gesture is actually running.
// `durationMinutes` is the event's REAL (unpadded) span —
// `trueDurationMinutes` below, never the rendered box height — since it's
// what both `timelineDrag.ts`'s `clampStartMinutes` and the final `endAt`
// the SERVER recomputes (`moveCalendarEvent`) must agree with; the rendered
// height is a pad for tappability, not a fact about the event (see this
// file's own `trueDurationMinutes` comment below).
export type TimelineDragPayload = {
  eventId: string;
  /** The column (day) this block STARTED in — not necessarily where it
   * ends up; CalendarViews.tsx resolves the drop day from `columnIndex`
   * plus the drag's horizontal travel, never from this alone. */
  day: Date;
  /** This day's own 0-based position within `columnDays` — the SAME index
   * `TimelineGrid.tsx`'s own `.map()` already has for free (:537-550). */
  columnIndex: number;
  /** `slot.block.topMinutes` — start-of-day minutes when the drag began. */
  topMinutes: number;
  durationMinutes: number;
  pxPerMinute: number;
  /** One day-column's rendered width, in pixels — see
   * TimelineGrid.tsx's own comment on where this is measured. `0` before
   * that first measurement lands, which `columnIndexFromOffset`
   * (timelineDrag.ts) treats as "no valid column" rather than something to
   * divide by. */
  columnWidthPx: number;
};

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
  /** mission-20 (CD1)/C5 — this day's own 0-based position within
   * `columnDays`, needed to build a `TimelineDragPayload` that can resolve
   * a horizontal drag into a DIFFERENT day. Not derivable from `day` alone
   * (an `indexOf` would re-scan the array per block for no reason) — the
   * caller already has this for free from its own `.map()`
   * (TimelineGrid.tsx:537-550). */
  columnIndex: number;
  /** mission-20 (CD1)/C5 — one day-column's rendered width in pixels,
   * measured once by the caller (the SAME live-measurement effect that
   * already sizes the scroller's height — see TimelineGrid.tsx's own
   * comment) and handed down as a plain number rather than re-measured
   * here: every column is the SAME width (an equal-fraction CSS grid
   * track), so one measurement covers all of them. */
  columnWidthPx: number;
  /** mission-20 (CD1)/C5 — binds ONE draggable block; `undefined` for a
   * session that can't manage the calendar (a kid) — no handlers attached
   * means a long-press can never even start. See CalendarViews.tsx's own
   * comment for why that check lives there rather than here. The SAME
   * single hook instance `usePageSwipe`'s `isGestureClaimed` also consumes
   * (CalendarViews.tsx) — never a second one per block, which would make
   * the "only one pointer claimed at a time" guarantee impossible to keep. */
  getHandlers?: (payload: TimelineDragPayload) => LongPressDragHandlers;
  /** mission-20 (CD1)/C5 — which block (if any) is currently claimed as a
   * drag, and its live pixel offset since pointerdown. `null` whenever
   * nothing is dragging. Every column receives the SAME value and checks
   * its own blocks against `activeDrag.payload.eventId` — cheaper than the
   * caller filtering per column, and there is at most one dragged block at
   * a time regardless (`useLongPressDrag`'s own single-instance shape). */
  activeDrag: { payload: TimelineDragPayload; dx: number; dy: number } | null;
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
  columnIndex,
  columnWidthPx,
  getHandlers,
  activeDrag,
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
        // mission-20 (CD1)/C5 — everything CalendarViews.tsx's `onDragEnd`
        // needs, built fresh per block on every render so it can never go
        // stale mid-gesture (see TimelineDragPayload's own header comment).
        const dragPayload: TimelineDragPayload = {
          eventId: event.id,
          day,
          columnIndex,
          topMinutes: slot.block.topMinutes,
          durationMinutes: trueDurationMinutes,
          pxPerMinute,
          columnWidthPx,
        };
        const isDragging = activeDrag?.payload.eventId === event.id;
        // mission-20 (CD1)/F2(b) — a midnight-crossing event's fragment,
        // per `timelineLayout.ts`'s own `clippedStart`/`clippedEnd`: the
        // mission Brief puts dragging multi-day blocks out of scope, but
        // `belongsInAllDayRow` only routes an event out of `timed` if it's
        // marked all-day OR covers a FULL calendar day — a Mon 23:00 ->
        // Tue 02:00 event is neither, so it draws two clipped fragments
        // right here, in `timed`. Neither `dragPayload` above nor
        // CalendarViews.tsx's `onDragEnd` reads `clippedStart`/
        // `clippedEnd` (that's out of scope too — it would need `onDragEnd`
        // to work from the event's real `startAt`, not `topMinutes`, and
        // `clampStartMinutes` to stop assuming one day), so a clipped
        // fragment must simply never become draggable: withhold the
        // handlers rather than attach ones that would compute a wrong
        // time.
        //
        // `slot.block` does NOT carry `clippedStart`/`clippedEnd` — Vision's
        // finding is right, its exact prescription (`slot.block.clippedStart`)
        // was wrong: `TimelineGrid.tsx:390-397` drops those two fields when
        // it builds the plain `TimelineBlock` (`id`/`topMinutes`/
        // `heightMinutes` only) it hands to `assignColumns`, and
        // `TimelineGrid.tsx` is outside this contract's boundary, so that
        // drop can't be undone at the source. `blockGeometry` is pure and
        // already imported one call site over (TimelineGrid.tsx:393) for the
        // SAME `(day, event)` pair that produced this very slot — calling it
        // again here, from data this component already has, reads the two
        // flags without editing a must-not-touch file. `?? false` is
        // defensive only: a slot that exists at all means `blockGeometry`
        // already returned non-null for this exact pair once; it cannot
        // rationally return null on an identical second call.
        const geometry = blockGeometry(day, event);
        const isClippedFragment = (geometry?.clippedStart || geometry?.clippedEnd) ?? false;
        return (
          <button
            key={slot.block.id}
            type="button"
            onClick={() => onOpenEvent(event, day)}
            // mission-20 (CD1)/C5 — `getHandlers` is `undefined` for a kid
            // session (CalendarViews.tsx's own client-side gate), so no
            // pointer handlers attach at all and a long-press can never
            // start; `onClickCapture` inside these handlers is what
            // swallows the click a COMPLETED drag's release leaves behind,
            // so it never also fires `onOpenEvent` above
            // (useLongPressDrag.ts's own header explains the mechanism).
            // mission-20/F2(b) — also withheld for a clipped fragment
            // (`isClippedFragment`, above), regardless of `getHandlers`.
            {...(getHandlers && !isClippedFragment ? getHandlers(dragPayload) : {})}
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
            // mission-20 (CD1)/C5 — the lift is `shadow-xl` plus a live
            // `transform` on THIS SAME button, never a separate overlay:
            // DESIGN.md's press-state rule ("a press state must never
            // reduce the legibility of a label inside its own target")
            // binds a control whose target is an overlay painted ABOVE its
            // own text — the exact shape a `-z-10`/absolutely-positioned
            // lift layer would recreate. A `transform`/`box-shadow` on the
            // button ITSELF carries every descendant (the title span
            // below) along for the ride unchanged — same colour, same
            // opacity, same DOM node — so the label's ink count and
            // contrast survive the lift by construction, not by measurement
            // after the fact.
            className={`absolute flex flex-col justify-start overflow-hidden rounded-md border px-1 text-left leading-tight ${
              past ? "border-muted text-muted" : "border-fg text-fg"
            } ${isDragging ? "shadow-xl" : ""}`}
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
              // mission-20 (CD1)/C5 — `translate` follows the finger's raw
              // pixel offset since pointerdown (useLongPressDrag.ts's own
              // `activeDrag.dx/dy`); `scale(1.05)` is the lift itself. Both
              // live in the SAME `transform` string on purpose — an inline
              // style always wins specificity over a Tailwind utility
              // class, so a separate `scale-105` class here would silently
              // lose the translate the moment this object also sets
              // `transform`. `zIndex: 30` clears the sticky header
              // (`z-20`, TimelineGrid.tsx) so a block dragged toward the
              // top of the rail draws above it rather than under it.
              ...(activeDrag && isDragging
                ? {
                    transform: `translate(${activeDrag.dx}px, ${activeDrag.dy}px) scale(1.05)`,
                    zIndex: 30,
                  }
                : {}),
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
