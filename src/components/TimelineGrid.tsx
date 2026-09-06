"use client";

// The hour timeline — Day / 3 Day / Week's real renderer (mission-17, CV4,
// contract C2). Nothing in src/ has positioned anything by TIME before this;
// every other calendar view (DaySection's agenda list, MonthGrid's pills) is
// a plain vertical list. This component turns `src/lib/timelineLayout.ts`
// (CV2's pure minutes-only geometry, unconsumed until now — see that file's
// own header) into pixels: a 24-row wall-clock rail, overlapping events side
// by side, an all-day strip above, and a live now-line.
//
// DEPENDENCY INJECTION, not internal hooks, for everything the CALLER
// already knows (mission-17/C1's own rider names the precedent:
// ScheduleFetchers, useScheduleMonthTitle's offset argument). Three
// consequences:
//   - `today`/`now` arrive as plain, already-resolved `Date`s — same
//     convention MonthGrid.tsx/DaySection.tsx's resolved branch already use
//     (their `today: Date`, never `Date | null`): the CALLER is what guards
//     `today === null` (useToday() hasn't resolved yet) and only mounts this
//     component once both are real, exactly like CalendarViews.tsx already
//     does for MonthGrid ("today !== null && anchor !== null && <MonthGrid
//     ...>"). `now` follows the identical shape via the new useNowMinute.ts
//     hook (this contract also ships), which this component deliberately
//     does NOT call itself — see that file's own header for why.
//   - `chromeOffsetPx`: mission-17/C1 is relocating APP_HEADER_HEIGHT_PX
//     into src/lib/appChrome.ts AT THE SAME TIME this file is being
//     written, in a separate worktree — importing it here would be
//     importing a file mid-edit by a parallel builder. This component
//     therefore takes the app header's height as a prop instead, exactly
//     the shape RecipeList.tsx already uses for the same constant (that
//     file "explicitly refuses to import a calendar component" for it).
//     It's used ONLY as the first-paint seed for the scroller's height (see
//     the sizing effect below) — the same "seed value now, refine with a
//     real measurement after mount" split C1's own contract documents for
//     APP_HEADER_HEIGHT_PX itself.
//   - The bottom nav's height is never imported or hardcoded either — see
//     the sizing effect's own comment for why a runtime measurement is used
//     there instead of a second hardcoded copy of the number ScheduleView.tsx
//     already carries inline (STRUCTURE.md's chrome-dimension rule treats a
//     runtime measurement as an equal-standing alternative to a shared
//     constant; a SECOND hardcode would not be).
//
// CONSUMES timelineLayout.ts's `partitionForTimeline`/`blockGeometry`/
// `assignColumns` UNCHANGED, and feeds the all-day strip to the EXISTING
// `monthLayout.assignLanes` — no second packer (D4). `TimelineEvent` and
// `MonthLayoutEvent` are structurally identical `{id, startAt, endAt,
// allDay}` shapes for exactly this reason, so the all-day row's events pass
// straight through with no conversion step; see the composition test in
// timelineLayoutPacking.test.ts, which mission-12/Captain flagged as
// load-bearing STRUCTURE, not incidental coverage — do not delete it just
// because this is now a real call site.

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarOff } from "lucide-react";
import {
  MINUTES_PER_DAY,
  minutesOfDay,
  blockGeometry,
  partitionForTimeline,
  assignColumns,
  type TimelineEvent,
  type TimelineColumnSlot,
  type TimelineBlock,
} from "@/lib/timelineLayout";
import { assignLanes } from "@/lib/monthLayout";
import { addDays, isSameDay, SHORT_DAY_NAMES } from "@/lib/mealPlanDates";
import { daysEventCovers, formatTimeRange, isOutsideWindow, isPast } from "@/lib/calendarDates";
import { avatarColorHex } from "@/lib/constants";
import { hexToRgba } from "@/lib/color";
import type { CalendarEventView } from "@/lib/types";

/** The rail's own scale — CSS custom property `--hour-height`, per the
 * contract, so nothing else in this file's markup repeats the raw number.
 * 48px/hour means a MIN_BLOCK_MINUTES (30 min, timelineLayout.ts) block
 * draws 24px tall — see the block-rendering section below for why that's a
 * disclosed, reasoned exception to the 44px floor rather than a miss. */
const HOUR_HEIGHT_PX = 48;
const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;
/** Tied to timelineLayout.ts's own MINUTES_PER_DAY (D2's "always 1440
 * rail minutes" invariant) rather than a bare 24, so a change to that
 * constant could never silently disagree with how many rows this file
 * draws. */
const HOURS_PER_DAY = MINUTES_PER_DAY / 60;
const GUTTER_WIDTH_PX = 48;

/** Fallback only — refined by a real measurement the instant this mounts
 * (the sizing effect below). Matches HubNav.tsx's own `min-h-16` (64px);
 * kept here as a DEFENSIVE fallback for the rare case the nav element isn't
 * found at all, never as this component's real answer for how tall it is —
 * see that effect's own comment for why a live DOM measurement is used
 * instead of a second hardcoded copy of the number ScheduleView.tsx already
 * carries inline for the identical purpose. */
const NAV_HEIGHT_FALLBACK_PX = 64;
const MIN_SCROLLER_HEIGHT_PX = 320;

/** Hour gutter labels ("12 AM", "1 AM", ... "11 PM") via `Intl`, computed
 * once at module load against a fixed, deliberately non-transition date
 * (Jan 1 — nowhere near either US DST boundary) purely as a vehicle to get
 * `Intl.DateTimeFormat` to spell out a given HOUR NUMBER, never rendered or
 * compared as a real calendar day. */
const HOUR_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true });
const HOUR_LABELS = Array.from({ length: HOURS_PER_DAY }, (_, hour) =>
  HOUR_LABEL_FORMATTER.format(new Date(2000, 0, 1, hour, 0)),
);

/** Up to 3 diagonal bands (Month's own cap, EventCard.tsx's own comment for
 * why THIS pill is capped tighter than EventCard's uncapped list version) —
 * a private, minimal variant, not a copy: MonthCell.tsx's `pillBackground`
 * and EventCard.tsx's `bandBackground` are both off this contract's
 * boundary (must-not-touch), so this is a third genuinely-separate
 * implementation of the same small idea, same as those two already are of
 * each other (color.ts's own header: "genuine variants stay separate, only
 * the byte-identical leaf helper — hexToRgba — moved"). `alpha`/opaque
 * `var(--surface)` backdrop and the two alpha values (0.10 live / 0.05
 * past) are copied EXACTLY from EventCard's already-measured numbers
 * (mission-8/Strange: worst case 4.64:1 light / 5.53:1 dark across all 8
 * AVATAR_COLORS) — reusing the identical inputs is what makes reusing that
 * finding valid here too, with no new contrast pass needed. */
function blockBackground(colors: string[], alpha: number): string {
  if (colors.length === 0) return "var(--surface-2)";
  const bandWidth = 100 / colors.length;
  const stops = colors.flatMap((hex, index) => {
    const color = hexToRgba(hex, alpha);
    return [`${color} ${index * bandWidth}%`, `${color} ${(index + 1) * bandWidth}%`];
  });
  return `linear-gradient(135deg, ${stops.join(", ")}), var(--surface)`;
}

type TimelineGridProps = {
  /** `[anchor]` (Day) / `[anchor, +1, +2]` (3 Day, anchor-relative, never
   * snapped — Google's own behaviour) / the 7 days of `sundayOf(anchor)`
   * (Week). The CALLER (mission-17/C4) decides which; this component only
   * ever renders however many columns it's handed. */
  columnDays: Date[];
  events: CalendarEventView[];
  /** Both real, resolved `Date`s — see this file's own header for why
   * neither is `| null` here, unlike the `useToday()`/`useNowMinute()`
   * hooks that produce them. */
  today: Date;
  now: Date;
  /** page.tsx's fetch bounds — drives the SAME `isOutsideWindow` check
   * MonthCell/DaySection already use, applied per column in the all-day
   * strip (see that section below), per MonthCell's own not-loaded policy:
   * three states (loading, empty, outside-window), never two. */
  windowStart: Date;
  windowEnd: Date;
  onOpenEvent: (event: CalendarEventView, day: Date) => void;
  /** The app's global sticky header's rendered height — see this file's own
   * header for why this is a prop rather than an import of
   * APP_HEADER_HEIGHT_PX. Used only as the scroller's first-paint height
   * seed (a CSS `calc()` string, safe under SSR); a real measurement
   * refines it the instant this mounts. */
  chromeOffsetPx: number;
};

/** One event's shape as the pure layout library needs it — see
 * timelineLayout.ts's own `TimelineEvent` doc comment for why this is
 * deliberately narrower than `CalendarEventView`. */
function toTimelineEvent(event: CalendarEventView): TimelineEvent {
  return { id: event.id, startAt: event.startAt, endAt: event.endAt, allDay: event.allDay };
}

export function TimelineGrid({
  columnDays,
  events,
  today,
  now,
  windowStart,
  windowEnd,
  onOpenEvent,
  chromeOffsetPx,
}: TimelineGridProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const columnDaysKey = columnDays.map((day) => day.getTime()).join(",");

  // --- Sizing: this component's own overflow-y-auto scroller, sized from
  // the measured header + nav (the contract's own words), not a computed
  // guess. `chromeOffsetPx` seeds the CSS `calc()` used for the very first
  // paint (and SSR, since a client component still renders once on the
  // server for its initial HTML) — cheap and correct because a `height`
  // isn't a pinned `style={{ top }}`; a one-paint-late refinement here reads
  // as the box settling, not as content jumping under a fixed point (see
  // mission-16/C1's own rider comment for the general "fine for scroll-mt,
  // not fine for a pinned top" distinction this borrows).
  //
  // The bottom nav's real height is MEASURED, deliberately never imported
  // or hardcoded: HubNav.tsx exports no constant for it today (ScheduleView
  // .tsx's own `-65px` IntersectionObserver margin is an inline hardcode,
  // not a shared one), and this file is not allowed to touch either of
  // those. STRUCTURE.md's chrome-dimension rule treats a runtime
  // measurement as an equal-standing alternative to a shared constant — a
  // SECOND hardcoded copy of that same number would not be. `aria-label`
  // selector, not a class, because HubNav.tsx's own `aria-label="Sections"`
  // is already the one stable, accessibility-driven hook on that element;
  // nothing here depends on its CSS classes.
  const [measuredHeightPx, setMeasuredHeightPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    function measure() {
      const top = scroller!.getBoundingClientRect().top;
      const nav = document.querySelector('nav[aria-label="Sections"]');
      const navHeightPx = nav?.getBoundingClientRect().height ?? NAV_HEIGHT_FALLBACK_PX;
      const available = Math.max(window.innerHeight - top - navHeightPx, MIN_SCROLLER_HEIGHT_PX);
      setMeasuredHeightPx(available);
      // Applied imperatively, in addition to the React state update above,
      // for a real reason and not a redundant belt-and-suspenders: the
      // scroll-to-now effect below runs in the SAME commit, immediately
      // after this one, and reads `scroller.clientHeight` — a React state
      // update doesn't reach the DOM until the NEXT render/commit, which is
      // too late for that read. Mutating `style.height` here directly means
      // the very next `getBoundingClientRect()`/`clientHeight` read in this
      // same synchronous pass already reflects the real measured height,
      // not the previous render's `calc()` first-paint seed. (Caught by
      // measuring, not assumed: without this line, the scroll-to-now target
      // was computed against the calc() fallback's clientHeight — visibly
      // wrong on a real device, where the fallback overshoots the true
      // available height.)
      scroller!.style.height = `${available}px`;
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // Re-measures on every column-set change too (a view switch), not just
    // on mount: cheap, and correct if the chrome above this component ever
    // renders at a different height for a different view (it doesn't
    // today, but nothing here should assume that stays true forever).
  }, [columnDaysKey]);

  const scrollerHeightStyle =
    measuredHeightPx !== null
      ? `${measuredHeightPx}px`
      : `calc(100dvh - ${chromeOffsetPx + NAV_HEIGHT_FALLBACK_PX}px)`;

  // --- Scroll-to-now on open (or 7 AM when today isn't one of the columns).
  // Keyed ONLY on the column set, deliberately excluding `today`/`now` from
  // the dependency array (both are read fresh inside, via the ref, each
  // time this DOES run) — including `now` would re-run this every 60s tick
  // (useNowMinute.ts's own poll interval) and yank the reader's scroll
  // position back to "now" while they're trying to read something earlier
  // or later in the day, which is not what "scroll to now ON OPEN" means.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const todayIndex = columnDays.findIndex((day) => isSameDay(day, today));
    const targetTopPx =
      todayIndex === -1
        ? 7 * 60 * PX_PER_MINUTE
        : Math.max(0, minutesOfDay(now) * PX_PER_MINUTE - scroller.clientHeight / 3);
    scroller.scrollTop = targetTopPx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnDaysKey]);

  // --- Layout: partitionForTimeline (CV2, unchanged) splits into the
  // all-day row and the timed set; the all-day row is THEN fed to the
  // EXISTING monthLayout.assignLanes (D4) — no second packer.
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const { allDayRow, timed } = useMemo(
    () => partitionForTimeline(columnDays, events.map(toTimelineEvent)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnDaysKey, events],
  );
  const { spans: allDaySpans, overflowByDay } = useMemo(
    () => assignLanes(columnDays, allDayRow),
    [columnDays, allDayRow],
  );
  const maxAllDayLane = allDaySpans.reduce((max, span) => Math.max(max, span.lane), -1);

  // One `assignColumns` call PER COLUMN (never once for the whole set) —
  // each day's timed blocks are laid out independently, which is what lets
  // a Fri 10 PM -> Sat 2 AM event draw a clipped block on BOTH days without
  // the two clipped halves fighting over one shared column assignment.
  const columnSlots: TimelineColumnSlot<TimelineBlock>[][] = columnDays.map((day) => {
    const blocks: TimelineBlock[] = [];
    for (const event of timed) {
      const geometry = blockGeometry(day, event);
      if (geometry) {
        blocks.push({ id: event.id, topMinutes: geometry.topMinutes, heightMinutes: geometry.heightMinutes });
      }
    }
    return assignColumns(blocks);
  });

  const gridTemplateColumns = `${GUTTER_WIDTH_PX}px repeat(${columnDays.length}, minmax(0, 1fr))`;
  const compact = columnDays.length > 1; // 3 Day / Week — Day view (1 column) gets more detail (D5).
  const dayBeforeSet = addDays(columnDays[0], -1);
  const dayAfterSet = addDays(columnDays[columnDays.length - 1], 1);

  return (
    <div
      className="overflow-hidden rounded-xl border border-line"
      style={{ ["--hour-height" as string]: `${HOUR_HEIGHT_PX}px` }}
    >
      <div ref={scrollerRef} className="overflow-y-auto" style={{ height: scrollerHeightStyle }}>
        {/* Sticky as ONE unit — the weekday header and the all-day strip
            stack inside it via ordinary flow, so there's no second `top`
            offset to compute or keep in sync with the first (a smaller,
            local version of the exact problem STRUCTURE.md's chrome-
            dimension rule exists for, avoided here by never splitting this
            into two independently-positioned sticky elements). Containing
            block for `sticky` here is `scrollerRef`'s own div — the nested
            overflow-y-auto element — genuinely a scroll container
            regardless of html/body's own overflow status (mission-16/C4's
            fix was about the DOCUMENT's scroller; this one is deliberate
            and local, so it was never affected either way). */}
        <div className="sticky top-0 z-20 border-b border-line bg-bg">
          <div className="grid py-1" style={{ gridTemplateColumns }}>
            <span aria-hidden="true" />
            {columnDays.map((day) => {
              const isToday = isSameDay(day, today);
              const notLoaded = isOutsideWindow(day, windowStart, windowEnd);
              return (
                <div key={day.getTime()} className="flex flex-col items-center gap-0.5 px-0.5">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? "text-accent" : "text-muted"}`}>
                    {SHORT_DAY_NAMES[day.getDay()]}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday ? "bg-accent text-accent-fg" : "text-fg"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {/* Per-column not-loaded glyph — MonthCell's own policy
                        (small, muted, next to the day number), applied here
                        rather than inside the all-day lanes below: a day
                        with zero all-day events still needs somewhere to
                        say "not fully fetched," and the header cell is
                        where MonthCell puts the identical fact. */}
                    {notLoaded && <CalendarOff aria-hidden="true" size={9} className="shrink-0 text-muted" />}
                  </span>
                </div>
              );
            })}
          </div>

          {/* All-day strip — CSS grid so a spanning bar is one element
              placed by gridColumn/gridRow, not N per-column copies. Only
              rendered with real height when there's something to show
              (mission-8/K2's own "an empty state must not claim space a
              real one would" discipline) — an empty grid with zero rows
              collapses to nothing, exactly like Month's own "+N more" line
              only appearing when overflow > 0. */}
          {maxAllDayLane >= 0 && (
            <div
              className="grid gap-0.5 px-1 pb-1"
              style={{ gridTemplateColumns, gridAutoRows: "18px" }}
            >
              <span aria-hidden="true" />
              {allDaySpans.map((span) => {
                const event = eventById.get(span.event.id);
                if (!event) return null; // defensive; every span's event came from `events`
                const continuesBefore =
                  daysEventCovers(event.startAt, event.endAt, event.allDay, [dayBeforeSet]).length > 0;
                const continuesAfter =
                  daysEventCovers(event.startAt, event.endAt, event.allDay, [dayAfterSet]).length > 0;
                const colors = event.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
                // The representative day for this bar's tap target — the
                // first column it actually touches in THIS render, not
                // necessarily the event's true start (a bar continuing from
                // before `columnDays[0]` still needs a real day to open the
                // detail sheet against).
                const representativeDay = columnDays[span.startCol];
                return (
                  <button
                    key={span.event.id}
                    type="button"
                    onClick={() => onOpenEvent(event, representativeDay)}
                    className={`truncate border-y px-1 text-left text-[9px] font-semibold leading-[18px] text-fg border-fg ${
                      continuesBefore ? "" : "rounded-l border-l"
                    } ${continuesAfter ? "" : "rounded-r border-r"}`}
                    style={{
                      gridColumn: `${span.startCol + 2} / ${span.endCol + 3}`,
                      gridRow: span.lane + 1,
                      background: blockBackground(colors, 0.1),
                    }}
                  >
                    {event.title}
                  </button>
                );
              })}
              {columnDays.map((day, col) =>
                overflowByDay[col] > 0 ? (
                  <span
                    key={`overflow-${day.getTime()}`}
                    className="text-[9px] leading-[18px] text-muted"
                    style={{ gridColumn: col + 2, gridRow: maxAllDayLane + 2 }}
                  >
                    +{overflowByDay[col]} more
                  </span>
                ) : null,
              )}
            </div>
          )}
        </div>

        {/* The hour rail: a gutter of 24 labels, then one relatively-
            positioned column per day holding gridlines, the now-line (only
            in today's own column, if present), and every timed block. */}
        <div
            className="relative grid"
            style={{ gridTemplateColumns, height: `calc(var(--hour-height) * ${HOURS_PER_DAY})` }}
          >
          <div className="relative">
            {HOUR_LABELS.map((label, hour) => (
              <span
                key={hour}
                aria-hidden="true"
                className="absolute right-1 -translate-y-1/2 text-[10px] text-muted"
                style={{ top: `calc(var(--hour-height) * ${hour})` }}
              >
                {hour === 0 ? "" : label}
              </span>
            ))}
          </div>

          {columnDays.map((day, columnIndex) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={day.getTime()} className="relative border-l border-line">
                {Array.from({ length: HOURS_PER_DAY }, (_, hour) => (
                  <div
                    key={hour}
                    aria-hidden="true"
                    className="absolute inset-x-0 border-t border-line/60"
                    style={{ top: `calc(var(--hour-height) * ${hour})` }}
                  />
                ))}

                {columnSlots[columnIndex].map((slot) => {
                  const event = eventById.get(slot.block.id);
                  if (!event) return null; // defensive; every block came from `timed`/`eventById`
                  const past = isPast(event.endAt, now); // real "now", not day-granular `today` — see below
                  const colors = event.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
                  const heightPx = slot.block.heightMinutes * PX_PER_MINUTE;
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
                      // 44px NOTE, disclosed rather than silently missed: at
                      // this file's HOUR_HEIGHT_PX (48), a MIN_BLOCK_MINUTES
                      // (30 min, timelineLayout.ts) block draws
                      // 30/60 * 48 = 24px tall — under DESIGN.md's 44px
                      // floor, and shorter than timelineLayout.ts's own
                      // comment on MIN_BLOCK_MINUTES claims ("comfortably
                      // tappable at the app's touch-first 48px minimum" is
                      // only true at HOUR_HEIGHT_PX >= 96, i.e. 96px/hour;
                      // that library, off this contract's boundary, was not
                      // edited — see the mission report for this as a named
                      // finding). This box is NOT inflated past its computed
                      // geometry: `assignColumns` only guarantees siblings
                      // never overlap up to exactly this padded height, so
                      // stretching one tap target further would either
                      // overlap the very next block in the same column or
                      // silently reintroduce the ambiguous-tap bug the pad
                      // exists to prevent. Every block is still its OWN real
                      // `<button>`, individually tappable at whatever height
                      // it draws — Google's and Apple's own hour timelines
                      // accept the identical tradeoff for short events.
                      className={`absolute overflow-hidden rounded-md border px-1 text-left leading-tight ${
                        past ? "border-muted text-muted" : "border-fg text-fg"
                      }`}
                      style={{
                        top: `${slot.block.topMinutes * PX_PER_MINUTE}px`,
                        height: `${heightPx}px`,
                        left: `calc(${slot.column} / ${slot.columnCount} * 100%)`,
                        width: `calc(100% / ${slot.columnCount})`,
                        background: blockBackground(colors, past ? 0.05 : 0.1),
                      }}
                    >
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
                          one already is. */}
                      {!compact && heightPx >= 40 && (
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
                    style={{ top: `${minutesOfDay(now) * PX_PER_MINUTE}px` }}
                  >
                    <span className="h-2 w-2 -translate-x-1 rounded-full bg-danger" />
                    <span className="h-px flex-1 bg-danger" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
