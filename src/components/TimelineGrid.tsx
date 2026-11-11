"use client";

// The hour timeline — Day / 3 Day / Week's real renderer (mission-17, CV4,
// contract C2). Nothing in src/ has positioned anything by TIME before this;
// every other calendar view (DaySection's agenda list, MonthGrid's pills) is
// a plain vertical list. This component turns `src/lib/timelineLayout.ts`
// (CV2's pure minutes-only geometry, unconsumed until now — see that file's
// own header) into pixels: a 24-row wall-clock rail, overlapping events side
// by side, a live now-line, and (via `./TimelineAllDayStrip.tsx`, mission-
// 17/C6) an all-day strip above.
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
//   - `chromeOffsetPx`: the hamburger row's height, taken as a prop (the
//     shape RecipeList.tsx also uses for chrome) rather than imported. It is
//     used ONLY as the first-paint seed for the scroller's height (see the
//     sizing effect below); a real measurement refines it after mount.
//   - Nothing sits below the scroller any more (no bottom tab bar), so its
//     height is just the viewport's remaining height under its own top edge.
//
// CONSUMES timelineLayout.ts's `partitionForTimeline`/`blockGeometry`/
// `assignColumns` UNCHANGED. `partitionForTimeline` splits `events` into the
// all-day row and the timed set once, HERE — `timed` feeds the hour rail
// below; `allDayRow` is handed to `./TimelineAllDayStrip.tsx` (mission-17/
// C6), which is what actually calls the EXISTING `monthLayout.assignLanes`
// (D4) — no second packer, and this file no longer calls it directly at
// all. `TimelineEvent` and `MonthLayoutEvent` are structurally identical
// `{id, startAt, endAt, allDay}` shapes for exactly this reason, so the
// all-day row's events pass straight through with no conversion step; see
// the composition test in timelineLayoutPacking.test.ts, which mission-12/
// Captain flagged as load-bearing STRUCTURE, not incidental coverage — do
// not delete it just because this is now a real call site (one level
// removed, through the strip component, rather than direct).
//
// mission-17/C5 added TASKS to the all-day strip, and the real "+N more"
// button that replaced the circular dead end Strange traced (Month's own
// "+N more" navigating to Day, which rendered an identical dead "+N more").
// Both now live entirely inside `./TimelineAllDayStrip.tsx` — see that
// file's own header for the full reasoning; this file only threads `tasks`,
// `onOpenTask`, and the already-partitioned `allDayRow` down to it.
//
// mission-17/C6 EXTRACTION: this file crossed STRUCTURE.md's 650-line hard
// cap (809 total / 434 code) after C5 grew the all-day strip past the seam
// Captain had already measured before C5 landed ("63 lines for 4 props,"
// this mission's own report) — C5's own boundary didn't allow creating a
// new file, so it wrote a disclosure instead of a split. Captain's own
// diagnosis, from this mission's gate round, is why this contract exists:
// "a must-not-touch boundary is a threshold you can satisfy by copying" — a
// boundary that forbids a new file is satisfied by writing a JUSTIFICATION
// instead of a SEAM. This contract takes the seam: the all-day grid (tasks,
// events, the expand state, the "+N more" button) moved to
// `./TimelineAllDayStrip.tsx` wholesale. What stays here: the weekday
// header row (day names, day numbers, the per-column not-loaded glyph), the
// "every column out of window" banner, the sizing/scroll-to-now effects,
// and the hour rail itself (gridlines, timed blocks, the now-line).
// `gridTemplateColumns` is computed once here and passed down as a STRING
// PROP — not re-derived from a second copy of `GUTTER_WIDTH_PX` in the new
// file — because the same value has to line up across the weekday header,
// the all-day strip, and the hour rail, and a private second copy is
// exactly the kind of drift Captain's own finding above warns about.
//
// mission-18/C1 EXTRACTION, the second one: C6's own split left this file
// at 649/650 total — one line under the hard cap, the contract's own named
// "known risk." The per-day TIMED render (gridlines, every event `<button>`,
// the now-line) moved wholesale to `./TimelineDayColumn.tsx`, one call per
// column, leaving real headroom rather than the one line C6 did. Same
// discipline throughout: every class name, inline style, and comment
// reproduced exactly, not rewritten — this is a line-count fix, not a
// behaviour change. `HOURS_PER_DAY`/`pxPerMinute` are passed down as
// plain numbers rather than re-derived in the new file from a private copy
// of the hour height, for the identical reason `gridTemplateColumns`
// itself is a prop and not a second formula. This same contract also fixed
// the per-column not-loaded `sr-only` string — see its own comment, right
// where the string lives, for the full defect.

import { useLayoutEffect, useRef, useState } from "react";
import { MINUTES_PER_DAY, minutesOfDay } from "@/lib/timelineLayout";
import { isSameDay } from "@/lib/mealPlanDates";
import { PAGE_BLEED_CLASSES } from "@/lib/gridClasses";
import { useTimelineZoom } from "@/lib/useTimelineZoom";
import { usePagedSwipe } from "@/lib/usePagedSwipe";
import { neighbourAnchor } from "@/lib/useCalendarPeriod";
import { VIEW_CONFIG } from "@/lib/calendarViewConfig";
import type { CalendarPeriodView } from "@/lib/calendarViewVocabulary";
import { PagedTrack } from "./PagedTrack";
import { TimelinePageHeader, TimelinePageColumns, GUTTER_WIDTH_PX } from "./TimelinePage";
import type { CalendarEventView, CalendarHabitDayView, CalendarTaskView } from "@/lib/types";

// The rail's own scale is LIVE (mission-65): `useTimelineZoom` returns the
// hour height in px (32 to 192, default 48, changed by a two-finger pinch,
// never below the height at which the whole day fills the visible rail),
// published below as the CSS custom property `--hour-height` so nothing else
// in this file's markup repeats the raw number. At the default 48px/hour a
// MIN_BLOCK_MINUTES (30 min, timelineLayout.ts) block draws 24px tall — see
// the block-rendering section in TimelineDayColumn.tsx for why that's a
// disclosed, reasoned exception to the 44px floor rather than a miss.
/** Tied to timelineLayout.ts's own MINUTES_PER_DAY (D2's "always 1440
 * rail minutes" invariant) rather than a bare 24, so a change to that
 * constant could never silently disagree with how many rows this file
 * draws. */
const HOURS_PER_DAY = MINUTES_PER_DAY / 60;

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

// The timed block's own colour banding (`bandedBackground`, up to 3
// diagonal bands, Month's own cap) used to be explained HERE, because this
// file called it directly. mission-18/C1 moved the timed block's whole
// render — including that call — into `./TimelineDayColumn.tsx`; see that
// file's own comment for the full history (the `blockBackground`
// misdiagnosis, the measured contrast numbers it reuses) rather than a
// stale copy of it sitting next to code that no longer calls the function.

type TimelineGridProps = {
  /** `[anchor]` (Day) / `[anchor, +1, +2]` (3 Day, anchor-relative, never
   * snapped — Google's own behaviour) / the 7 days of `sundayOf(anchor)`
   * (Week). The CALLER (mission-17/C4) decides which; this component only
   * ever renders however many columns it's handed. */
  columnDays: Date[];
  /** Mission 69 (C4): the view and its anchor, so the previous and next
   * pages of the sliding track get their own column days (the same
   * `VIEW_CONFIG[view].days` the caller used for `columnDays`). */
  view: CalendarPeriodView;
  anchor: Date;
  /** A page turn (1 = next), called by the swipe once the glide ends. */
  onTurn: (direction: 1 | -1) => void;
  /** Goes up by one each time Today is tapped, so scroll-to-now runs again
   * even when the columns do not change. */
  scrollToNowSignal: number;
  events: CalendarEventView[];
  /** mission-17/C5 — tasks due within the fetched window, the SAME shape
   * MonthGrid.tsx and DaySection.tsx already receive (CalendarViews.tsx
   * passes its one `tasks` prop through unfiltered to all three). Threaded
   * straight through to `./TimelineAllDayStrip.tsx` (mission-17/C6), which
   * decides which ones touch `columnDays` itself, via `assignLanes`, exactly
   * like Month already does for its own rows. */
  tasks: CalendarTaskView[];
  /** The viewer's planned habit days (decision 146), threaded to the all-day strip. */
  habitDays: CalendarHabitDayView[];
  /** Both real, resolved `Date`s — see this file's own header for why
   * neither is `| null` here, unlike the `useToday()`/`useNowMinute()`
   * hooks that produce them. */
  today: Date;
  now: Date;
  /** page.tsx's fetch bounds — drives the SAME `isOutsideWindow` check
   * MonthCell/DaySection already use, applied per column in the weekday
   * header row below, per MonthCell's own not-loaded policy: three states
   * (loading, empty, outside-window), never two. */
  windowStart: Date;
  windowEnd: Date;
  onOpenEvent: (event: CalendarEventView, day: Date) => void;
  /** Opens the task detail sheet for one task — same shape as
   * DaySection.tsx's own `onOpenTask` (`day` threaded through for the same
   * symmetry-with-onOpenEvent reason that file's own comment gives, even
   * though a task has exactly one due date and CalendarViews.tsx's actual
   * handler ignores it), so the same closure the daySection branch already
   * passes for `year` can be reused here unchanged. */
  onOpenTask: (task: CalendarTaskView, day: Date) => void;
  /** The hamburger row's height — see this file's own header for why this
   * is a prop. Used only as the scroller's first-paint height seed (a CSS
   * `calc()` string, safe under SSR); a real measurement refines it the
   * instant this mounts. */
  chromeOffsetPx: number;
  /** The signed-in person's id, the key for their remembered zoom (mission-65).
   * `null` means no saved zoom: the default hour height, nothing written. */
  viewerId: string | null;
};

export function TimelineGrid({
  columnDays,
  view,
  anchor,
  onTurn,
  scrollToNowSignal,
  events,
  tasks,
  habitDays,
  today,
  now,
  windowStart,
  windowEnd,
  onOpenEvent,
  onOpenTask,
  chromeOffsetPx,
  viewerId,
}: TimelineGridProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  // The hour rail, so the zoom can measure where it starts below the sticky header.
  const railRef = useRef<HTMLDivElement>(null);
  // mission-17/C7 (item 4) — a live DOM query, not React state, to avoid
  // the same-commit staleness the sizing effect's own imperative write
  // below already dodges the same way.
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const hourHeightPx = useTimelineZoom(viewerId, scrollerRef, railRef, stickyHeaderRef);
  const pxPerMinute = hourHeightPx / 60;
  // Mission 69 (C4): the root carries `--page-dx` and `data-glide`; the
  // header's track and the columns' track both read it, so they cannot
  // disagree. The gutter and the vertical scroller are not in a track.
  const rootRef = useRef<HTMLDivElement>(null);
  const { handlers } = usePagedSwipe({ varRef: rootRef, onTurn });
  const previousDays = VIEW_CONFIG[view].days(neighbourAnchor(view, anchor, -1));
  const nextDays = VIEW_CONFIG[view].days(neighbourAnchor(view, anchor, 1));

  // --- Sizing: this component's own overflow-y-auto scroller, sized from
  // its measured top edge to the bottom of the viewport. `chromeOffsetPx`
  // seeds the CSS `calc()` used for the very first paint (and SSR) — cheap
  // and correct because a `height` isn't a pinned `style={{ top }}`; a
  // one-paint-late refinement here reads as the box settling, not as
  // content jumping under a fixed point (see mission-16/C1's own rider
  // comment for the "fine for scroll-mt, not fine for a pinned top"
  // distinction this borrows).
  const [measuredHeightPx, setMeasuredHeightPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    function measure() {
      const top = scroller!.getBoundingClientRect().top;
      const available = Math.max(window.innerHeight - top, MIN_SCROLLER_HEIGHT_PX);
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
    // Re-measures on a view switch, not just on mount: cheap, and correct if
    // the chrome above this component ever renders at a different height for
    // a different view. Not keyed on the days: a page turn must not touch
    // the scroller (mission 69).
  }, [view]);

  const scrollerHeightStyle =
    measuredHeightPx !== null
      ? `${measuredHeightPx}px`
      : `calc(100dvh - ${chromeOffsetPx}px)`;

  // --- Scroll-to-now on open (or 7 AM when today isn't one of the columns).
  // Keyed on the view and on Today's signal (mission 69: it used to be the
  // column set, which a page turn changes, and the hours must keep their
  // place on a turn). Mount runs it too. `today`/`now` are deliberately
  // excluded from the dependency array (both are read fresh inside, via the ref, each
  // time this DOES run) — including `now` would re-run this every 60s tick
  // (useNowMinute.ts's own poll interval) and yank the reader's scroll
  // position back to "now" while they're trying to read something earlier
  // or later in the day, which is not what "scroll to now ON OPEN" means.
  // A zoom change is likewise not a reason to run it: it reads the live
  // `pxPerMinute` each time it DOES run, but pinching must never jump back.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const todayIndex = columnDays.findIndex((day) => isSameDay(day, today));
    // mission-17/C7, item 4 (Strange) — `clientHeight` covers the sticky
    // header too, so dividing it by 3 overshot "1/3 of the visible rail"
    // (measured 0.537, not ~0.33) as the all-day strip grew. Subtract it.
    const stickyHeaderHeightPx = stickyHeaderRef.current?.getBoundingClientRect().height ?? 0;
    const visibleRailHeightPx = Math.max(0, scroller.clientHeight - stickyHeaderHeightPx);
    const targetTopPx =
      todayIndex === -1
        ? 7 * 60 * pxPerMinute
        : Math.max(0, minutesOfDay(now) * pxPerMinute - visibleRailHeightPx / 3);
    scroller.scrollTop = targetTopPx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, scrollToNowSignal]);

  // One header page and one columns page per column set: the previous, the
  // current and the next. Neighbours get the same events, tasks and fetch
  // window, so a day outside it shows the not-loaded glyph, as an edge does.
  const headerPage = (days: Date[]) => (
    <TimelinePageHeader
      columnDays={days}
      events={events}
      tasks={tasks}
      habitDays={habitDays}
      today={today}
      windowStart={windowStart}
      windowEnd={windowEnd}
      onOpenEvent={onOpenEvent}
      onOpenTask={onOpenTask}
    />
  );
  const columnsPage = (days: Date[]) => (
    <TimelinePageColumns
      columnDays={days}
      events={events}
      today={today}
      now={now}
      hoursPerDay={HOURS_PER_DAY}
      pxPerMinute={pxPerMinute}
      onOpenEvent={onOpenEvent}
    />
  );

  return (
    <div
      ref={rootRef}
      data-fills-viewport className={`touch-pan-y overflow-hidden ${PAGE_BLEED_CLASSES}`}
      style={{ ["--hour-height" as string]: `${hourHeightPx}px` }}
      {...handlers}
    >
      <div ref={scrollerRef} className="overflow-y-auto pb-[env(safe-area-inset-bottom)]" style={{ height: scrollerHeightStyle }}>
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
            and local, so it was never affected either way). mission-17/C6:
            `TimelineAllDayStrip` renders as an ordinary child of this SAME
            sticky div — not its own sticky element — so this property
            survives the extraction unchanged. */}
        <div ref={stickyHeaderRef} className="sticky top-0 z-20 border-b border-line bg-bg">
          <PagedTrack
            previous={headerPage(previousDays)}
            current={headerPage(columnDays)}
            next={headerPage(nextDays)}
          />
        </div>

        {/* The hour rail: the columns' three pages (gridlines, the now-line
            in today's own column, every timed block), then the gutter of 24
            labels drawn over them, outside the track so it never slides. */}
        <div ref={railRef} className="relative" style={{ height: `calc(var(--hour-height) * ${HOURS_PER_DAY})` }}>
          <PagedTrack
            previous={columnsPage(previousDays)}
            current={columnsPage(columnDays)}
            next={columnsPage(nextDays)}
          />
          <div className="absolute inset-y-0 left-0 z-10 bg-bg" style={{ width: GUTTER_WIDTH_PX }}>
            {HOUR_LABELS.map((label, hour) => (
              <span
                key={hour}
                aria-hidden="true"
                className="absolute right-1 -translate-y-1/2 text-[0.625rem] text-muted"
                style={{ top: `calc(var(--hour-height) * ${hour})` }}
              >
                {hour === 0 ? "" : label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
