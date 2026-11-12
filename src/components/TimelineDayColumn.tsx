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
// comment: this component owns no state (its one hook only reads the root font size, mission-73). `slots` (this
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
// live hour height (mission-65)/`MINUTES_PER_DAY`-derived values — a second private
// copy of either is exactly the kind of drift this mission's own report
// (`GUTTER_WIDTH_PX`, and the old bottom-nav height) keeps finding.

import type { CSSProperties } from "react";
import { Repeat } from "lucide-react";
import { minutesOfDay, type TimelineColumnSlot, type TimelineBlock } from "@/lib/timelineLayout";
import { formatTimeRange, isPast } from "@/lib/calendarDates";
import { blockTextFit, zoomTextScale } from "@/lib/timelineZoom";
import { useRootFontPx } from "@/lib/useRootFontPx";
import { avatarColorHex } from "@/lib/constants";
import { personFill } from "@/lib/color";
import { canLiftOnTimeline } from "@/lib/timelineDrag";
import type { CalendarEventView } from "@/lib/types";

// Mission 77: a block is painted by `personFill` (src/lib/color.ts), up to 3
// diagonal bands (Month's own cap). Live: solid bands, white text. Past: a 15%
// wash, a 4px stripe in the first person's colour, `text-muted-strong`. No
// people: today's flat look. (This file took the timed-block use from
// TimelineGrid.tsx in mission-18/C1; the all-day strip's lives in
// TimelineAllDayBar.tsx.)

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
  /** Mission 70: the viewer may move events, so blocks may lift. */
  canDrag: boolean;
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
  canDrag,
}: TimelineDayColumnProps) {
  // Mission 73: block text grows with the zoom (the CSS reads --zoom-text-scale,
  // set by TimelineGrid from the same zoomTextScale); the line counts below need
  // the same numbers in real pixels, so they use the live root font size.
  const rootPx = useRootFontPx();
  const scale = zoomTextScale(pxPerMinute * 60);
  return (
    <div data-day-column className="@container relative border-l border-line">
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
        const fill = personFill(colors, past, 4);
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
        // Mission 70: only a timed block on one day may lift
        // (canLiftOnTimeline, timelineDrag.ts; useTimelineDrag.ts lifts it).
        const draggable = canDrag && canLiftOnTimeline(event);
        // Mission 73: one pure function (timelineZoom.ts blockTextFit) decides the
        // title tier, the whole title lines, and whether the time and location
        // lines fit in real pixels; this file only renders its answer.
        const fit = blockTextFit({ heightPx, trueDurationMinutes, rootPx, scale, compact, hasLocation: !!event.location });
        const { timeShown, locationShown } = fit;
        const oneLine = fit.titleLines === 1 && fit.titleLinesNarrow === 1;
        return (
          <button
            key={slot.block.id}
            type="button"
            data-drag-id={draggable ? event.id : undefined}
            onClick={() => onOpenEvent(event, day)}
            // Mission 77: the fill is solid (live) or a wash plus a left stripe
            // (past), so the border is transparent: it only keeps the box size.
            // With no people the old border-fg/border-muted outline stays.
            //
            // 44px NOTE — Strange's ruling (mission-17, gate round
            // 1): "accept the height, reject the abutment." At the
            // default hour height (48px, timelineZoom.ts), a
            // MIN_BLOCK_MINUTES (30 min, timelineLayout.ts) block
            // draws 30/60 * 48 = 24px tall — under DESIGN.md's 44px
            // floor. Inflating the box past its computed geometry
            // was rejected (it would either paint over a neighbor
            // or reintroduce the ambiguous tap the pad exists to
            // prevent, and doubling the hour height to clear 44px
            // outright would halve the visible day from 9.2 hours
            // to 4.6, paid on every open of the app's most-used
            // view). The exception carries a written boundary: a
            // timeline block's height is its duration; every block
            // stays a real `<button>` with a real accessible name;
            // Schedule (112px full-width rows) is the conforming
            // route for anyone who wants one. What the ruling did
            // NOT accept is the abutment between two such
            // blocks — see `drawnHeightPx` above for that fix.
            // Mission 70: no text selection or iPhone long-press menu; the
            // lifted look (data-lifted, set by useTimelineDrag.ts) is the
            // approved mock's: bigger, a shadow, a 2px accent outline. It
            // grows from its top left corner, so its lifted top stays on the
            // gutter marker's line (and a Day block does not grow over the
            // gutter). It moves by `translate`, never `transform`, so the
            // `scale` does not multiply the move; its glide home eases
            // `translate`; while lifted it follows in steps.
            className={`absolute flex flex-col justify-start overflow-hidden rounded-md border px-1 text-left leading-tight select-none [-webkit-touch-callout:none] transition-[translate,scale,box-shadow] duration-200 ease-out data-lifted:z-15 data-lifted:origin-top-left data-lifted:scale-104 data-lifted:shadow-lg data-lifted:outline-2 data-lifted:outline-accent data-lifted:transition-[scale,box-shadow] ${
              fill.look === "none"
                ? past ? "border-muted text-muted" : "border-fg text-fg"
                : `border-transparent ${fill.textClass}`
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
              ...fill.style,
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
            {/* @min-[128px] is px on purpose (mission-58): in rem it would move with Text size. */}
            {/* mission-65: under 20px tall the title takes a 12px line so it fits whole; mission-73 caps the small tier there at every zoom and Text size. */}
            {/* Mission 73: a compact column under 128px hides the time line, so it gets its own, larger line count. CHANGE TOGETHER with timelineZoom.ts's *_LINE_REM: the classes below are text-[length:calc(0.75rem*...)] (full), calc(0.625rem*...) (compact narrow), min(calc(0.625rem*...),10px) with a min(calc(0.75rem*...),12px) leading (small) and calc(0.5625rem*...) (time and location). */}
            <span
              className={`font-semibold break-words [-webkit-line-clamp:var(--clamp-narrow)] @min-[128px]:[-webkit-line-clamp:var(--clamp-wide)] ${
                oneLine ? "hyphens-manual" : "hyphens-auto"
              } ${
                fit.tier === "small"
                  ? "text-[length:min(calc(0.625rem*var(--zoom-text-scale,1)),10px)] leading-[min(calc(0.75rem*var(--zoom-text-scale,1)),12px)]"
                  : compact
                    ? "text-[length:calc(0.625rem*var(--zoom-text-scale,1))] @min-[128px]:text-[length:calc(0.75rem*var(--zoom-text-scale,1))]"
                    : "text-[length:calc(0.75rem*var(--zoom-text-scale,1))]"
              }`}
              style={
                {
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  "--clamp-narrow": fit.titleLinesNarrow,
                  "--clamp-wide": fit.titleLines,
                } as CSSProperties
              }
            >
              {event.title}
              {/* Mission 71: a repeating event's mark. It sits inside the
                  truncating title span, so a narrow block clips the icon
                  first and the title keeps its room. */}
              {event.seriesId && (
                <>
                  {/* zoom: 1 beats globals.css's Largest svg.lucide zoom; the icon is 1em, so it already follows Text size through the title's rem font. */}
                  <Repeat aria-hidden="true" style={{ zoom: 1 }} className={`ml-0.5 inline-block size-[1em] align-[-0.125em] ${fill.look === "none" ? "text-muted" : ""}`} />
                  <span className="sr-only">, repeats</span>
                </>
              )}
            </span>
            {/* The rule is the column's own width (D5, mission-46): a
                phone 3 Day or Week column (about 44 to 100px) keeps a
                colour band with 2-3 characters, same as the Month
                pill's own phone-width treatment, since a time line
                there would just overflow illegibly. From 8rem (128px)
                a compact column also gets the 12px title and the time
                line, so a wide Week column (about 157px) reads like
                Day. The location line stays Day only. Gated on the block's own drawn height
                too, so a 30-min Day-view block (24px) doesn't try
                to cram two more text lines into a box shorter than
                one already is — UNLESS the event's real duration
                is itself under MIN_BLOCK_MINUTES, in which case the
                height is a pad, not a fact, and the time line is
                the only place the truth (a genuine 15-minute
                appointment, not 30) can still be told. mission-65: that
                override also needs 24px of room (showsTimeLine,
                timelineZoom.ts), so zoomed out the block shows its
                title only, like Google. */}
            {timeShown && (
              <span data-drag-time className={`block truncate text-[length:calc(0.5625rem*var(--zoom-text-scale,1))] ${compact ? "hidden @min-[128px]:block" : ""}`}>{formatTimeRange(event.startAt, event.endAt)}</span>
            )}
            {locationShown && (
              <span className="block truncate text-[length:calc(0.5625rem*var(--zoom-text-scale,1))]">{event.location}</span>
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
          <span className="h-2 w-2 rounded-full bg-danger" />
          <span className="h-px flex-1 bg-danger" />
        </div>
      )}
    </div>
  );
}
