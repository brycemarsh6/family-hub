"use client";

// Extracted out of ScheduleView.tsx (mission-16/C9) — Captain's own seam,
// named at 538 lines and taken now that C7 pushed the file to 620/650 (the
// mechanical hard cap): "monthRefs, visibleMonthAnchor, titleSlot, the
// observer effect and the createPortal block." Owns "which month is
// currently topmost in the loaded Schedule list" and the header portal that
// answer feeds — see CalendarHeader.tsx's own SCHEDULE_TITLE_SLOT_ID comment
// for why a portal, not a prop.
//
// `revealLineY`/`titleSlotId` are taken as PARAMETERS rather than this file
// importing CalendarHeader's own constants (APP_HEADER_HEIGHT_PX,
// SCHEDULE_HEADER_BAR_HEIGHT_PX, SCHEDULE_TITLE_SLOT_ID) itself — a
// src/lib/ module reaching into src/components/ is the exact STRUCTURE.md
// violation useScheduleWindow.ts's own C5 header already fixed once (that
// file no longer imports the Server Actions it needs either, for the same
// reason — ScheduleView.tsx is the boundary "ALLOWED to know" which
// component owns those constants, per that file's own comment). Same
// dependency-injection shape `ScheduleFetchers`
// (useScheduleWindow.ts) and `loadBackward`/`loadForward`/`hasMoreRef`
// (useScheduleSentinels.ts) already establish in this same file family.
//
// No unit test alongside this one, for the same reason useScheduleSentinels
// .ts and useScrollAnchor.ts carry none: the one thing this hook computes —
// "which of these real DOM nodes' bounding rects has scrolled past a real
// pixel line" — has no meaning against a fake DOM node with no layout.
// Verified live against a running browser instead (see C9's own evidence:
// re-running C7's WebKit + Chromium measurements after the move).

import { createElement, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatMonthTitle } from "@/lib/mealPlanDates";
import type { ScheduleRenderMonth } from "@/lib/scheduleWindowState";

export type UseScheduleMonthTitleResult = {
  /**
   * Call with a month's own `monthStart` to get back a ref CALLBACK for that
   * month's rendered `<section>` — a factory, not a single stable function,
   * because each month needs its own closure over which key to set/delete
   * in the internal map (the same shape ScheduleView.tsx's own `dayRefs`
   * ref-callback used inline before this extraction; not memoized, matching
   * that it wasn't memoized there either).
   */
  monthSectionRef: (monthStart: Date) => (node: HTMLElement | null) => void;
  /**
   * The portaled month-title `<h2>`, already targeting `titleSlotId`'s DOM
   * node — `null` (nothing rendered) until that node exists, matching
   * `createPortal`'s own behavior for a null container. The caller renders
   * this directly (`{portal}`), same as it rendered the inline
   * `createPortal(...)` call before this extraction.
   */
  portal: ReactNode;
};

/**
 * `months` and `initialDay` are Captain's own named interface-in. `months`
 * is `useScheduleWindow`'s memoized render list — SEE THE RENDER-LOOP NOTE
 * BELOW before touching the effect's dependency array. `initialDay` seeds
 * the very first paint so it matches whatever CalendarHeader would have
 * shown anyway (no jump on load); this hook only ever moves the label from
 * there once the reader genuinely scrolls into a different month.
 */
export function useScheduleMonthTitle(
  months: ScheduleRenderMonth[],
  initialDay: Date,
  revealLineY: number,
  titleSlotId: string,
): UseScheduleMonthTitleResult {
  // One ref per rendered month `<section>`, watched by the "which month is
  // topmost" read below. Same reasoning as ScheduleView.tsx's own `dayRefs`:
  // a ref map churns on every render without needing to trigger one itself.
  const monthRefs = useRef(new Map<number, HTMLElement>());

  // Seeded with `initialDay`'s own month — see this hook's own doc comment.
  const [visibleMonthAnchor, setVisibleMonthAnchor] = useState(initialDay);

  // mission-16/C7 — mirrors `visibleMonthAnchor`'s latest value without
  // being a state read the effect below has to depend on (ref-not-state,
  // same reasoning as ScheduleView.tsx's own `hasScrolledInitially`/
  // `seededInitialDayTime`). Needed to break a genuine infinite-render
  // loop the scroll-driven effect below would otherwise cause:
  // `useScheduleWindow.ts`'s `months` is memoized on
  // `[state, today, initialDay]`, and `useToday()` hands back a FRESH
  // `Date` object every render even when the underlying calendar day
  // hasn't moved — so `months` gets a new array reference on effectively
  // every render, re-running the effect below every time. Without this
  // ref-backed guard, it would hand back a new `Date` instance for the
  // SAME calendar month on every run, which `Object.is` always treats as
  // changed, triggering a re-render, a new `months` reference, another
  // effect run, another "changed" Date... an unbounded loop (reproduced
  // and confirmed via React's own "Maximum update depth exceeded" error
  // before this guard was written — see C7's own report). The comparison
  // below is deliberately by `.getTime()`, never by the `Date` object's
  // own identity: two `Date`s holding the same instant are never `===`,
  // so an identity check would defeat the guard entirely.
  //
  // THIS IS THE THING A CARELESS FUTURE EDIT BREAKS. Moving this ref, or
  // widening the effect's own dependency array to include something that
  // changes identity every render without ALSO gating the `setState` call
  // behind a `.getTime()` comparison, re-arms the exact loop this guard
  // exists to stop.
  const visibleMonthAnchorRef = useRef(initialDay);

  // The header portal's target node. CalendarHeader and ScheduleView are
  // SIBLINGS under CalendarViews.tsx, both committed to the DOM in the same
  // pass — see CalendarViews.tsx's own comment on that co-mounting
  // requirement, and CalendarHeader.tsx's SCHEDULE_TITLE_SLOT_ID comment for
  // why this is a portal rather than a prop. Looked up inside the
  // scroll-driven effect just below rather than a standalone effect of its
  // own: an effect that does nothing but a direct DOM read + setState, with
  // no subscription of any kind, is exactly the "cascading render" shape
  // react-hooks/set-state-in-effect exists to catch — RecipeList.tsx's own
  // `railTop` measurement establishes the same fix (fold the direct read
  // into an effect that ALSO subscribes to something real), rather than
  // suppressing the rule.
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);

  // mission-16/C7 (Vision's BLOCKER, fixed there, moved intact here) — this
  // used to reuse the "today visible" observer's own instrument: an
  // IntersectionObserver whose `rootMargin` carved out a thin band meant to
  // start exactly where content clears both pinned bars. That band was
  // INVERTED on any viewport shorter than ~1135px, which is every phone —
  // see C7's own report for the full WebKit-vs-Chrome measurement. The fix
  // drops the observer entirely and reads the DOM directly on scroll: of
  // the handful of month `<section>`s actually rendered, which one's top
  // has scrolled up past `revealLineY` (the real bottom edge of the two
  // stacked pinned bars) — the LAST one for which that's true, since months
  // render in chronological/DOM order and a `<section>` further down the
  // list can never start higher on screen than one before it.
  // `getBoundingClientRect()` on a handful of nodes per scroll/resize is not
  // a performance concern at this scale; batched behind
  // `requestAnimationFrame` so a fast scroll can't queue the read more than
  // once per frame.
  useLayoutEffect(() => {
    // Named, rather than an inline `setTitleSlot(...)` statement, for the
    // same reason RecipeList.tsx's own `measure()` is — see the `titleSlot`
    // declaration's own comment above.
    function syncTitleSlot() {
      setTitleSlot(document.getElementById(titleSlotId));
    }
    syncTitleSlot();

    if (months.length === 0) return;

    let framePending = false;

    function syncVisibleMonth() {
      framePending = false;
      let current: Date | null = null;
      for (const month of months) {
        const node = monthRefs.current.get(month.monthStart.getTime());
        if (!node) continue;
        if (node.getBoundingClientRect().top > revealLineY) break;
        current = month.monthStart;
      }
      // A `null` result means the reader hasn't scrolled far enough for ANY
      // month's top to have cleared the reveal line yet (e.g. still at the
      // very start of the list) — leave `visibleMonthAnchor` at whatever it
      // already is (seeded to `initialDay`'s own month) rather than
      // clearing it, matching this state's own established rule that it
      // only ever moves once the reader genuinely scrolls into a different
      // month.
      //
      // The `.getTime()` comparison against the ref (not the `current`
      // Date's own identity) is what makes this idempotent — see
      // `visibleMonthAnchorRef`'s own comment above for the infinite-loop
      // this guards against.
      if (current && current.getTime() !== visibleMonthAnchorRef.current.getTime()) {
        visibleMonthAnchorRef.current = current;
        setVisibleMonthAnchor(current);
      }
    }

    function onScrollOrResize() {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(syncVisibleMonth);
    }

    syncVisibleMonth();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
    // `revealLineY`/`titleSlotId` are stable primitives across renders (the
    // caller passes a constant sum and a constant id string), so including
    // them here costs nothing beyond what `months` already governs — see
    // the render-loop note above for why `months` itself needs the internal
    // ref guard rather than being left out of this array.
  }, [months, revealLineY, titleSlotId]);

  function monthSectionRef(monthStart: Date) {
    return (node: HTMLElement | null) => {
      if (node) monthRefs.current.set(monthStart.getTime(), node);
      else monthRefs.current.delete(monthStart.getTime());
    };
  }

  // `.ts`, not `.tsx` (matching useScheduleSentinels.ts/useScrollAnchor.ts's
  // own extension), so the portaled element is built with `createElement`
  // rather than JSX syntax — the same house pattern GroceryRow.tsx already
  // established for building an element from a non-JSX-file context.
  // Matches the non-pinned title's own markup exactly (CalendarHeader.tsx),
  // so switching in and out of Schedule shows the identical style.
  const portal = titleSlot
    ? createPortal(
        createElement(
          "h2",
          { className: "truncate text-lg font-semibold" },
          formatMonthTitle(visibleMonthAnchor),
        ),
        titleSlot,
      )
    : null;

  return { monthSectionRef, portal };
}
