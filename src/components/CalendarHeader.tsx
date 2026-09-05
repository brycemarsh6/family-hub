"use client";

import { CalendarCheck, CalendarRange, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ActionCircle } from "./ActionCircle";
import { VIEW_LABELS, type CalendarPeriodView } from "@/lib/calendarViewVocabulary";

/**
 * The Calendar branch's header row: the Today/view-switcher/Add circles,
 * then the prev/next arrows around the period title. Extracted out of
 * CalendarViews.tsx (mission-8's Captain pass-2 recommendation, made "up
 * front" rather than after K2/K3 pile more onto that file) — this
 * component owns zero state of its own, it only renders what CalendarViews
 * already computed. Every prop below is exactly the value CalendarViews'
 * JSX used to read directly; moving this out changes nothing about what
 * renders, which is why the C4 contract requires a pixel diff before
 * building anything new on top of it.
 *
 * The Add circle (mission-9/C5, Strange's B1 remedy) replaces the
 * FloatingAddButton the Calendar branch used to render on top of the page
 * content. That overlay covered real, tappable day numbers on Month's
 * 7-column grid — the FAB is 56px, wider than a 44.42px cell, so no corner
 * placement escapes it, and a fixed-position overlay can't be moved by
 * document padding either (both were measured and both failed). Removing
 * it here rather than per-view keeps the switcher's own DESIGN.md rule —
 * "its tabs never change as you move" — from being violated by an Add
 * button that would otherwise jump from a floating bottom-left position on
 * Week/Day to a header circle on Month alone.
 */
export function CalendarHeader({
  view,
  onPickView,
  todayResolved,
  isCurrentPeriod,
  onToday,
  title,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  prevLabel,
  nextLabel,
  showArrows,
  canManage,
  onAdd,
}: {
  /** The real union, imported rather than hand-written (mission-11/C1) —
   * the local copy that used to sit here was a second place the view
   * vocabulary lived, and it disagreed with `CalendarPeriodView` the moment
   * anything widened the type. It now comes from calendarViewVocabulary.ts,
   * which is also where this file reads the switcher circle's label from
   * (mission-11/C2) — importing `VIEW_CONFIG` out of CalendarViews.tsx for
   * that would have recreated the component-to-component cycle that file's
   * own header warns about. */
  view: CalendarPeriodView;
  onPickView: () => void;
  /** False while useToday() hasn't resolved yet — see CalendarViews.tsx. */
  todayResolved: boolean;
  isCurrentPeriod: boolean;
  onToday: () => void;
  /** Null while `today` hasn't resolved — renders the same pulsing
   * placeholder CalendarViews' inline version did. */
  title: string | null;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  prevLabel: string;
  nextLabel: string;
  /**
   * mission-15/C4 — Schedule has no period to page between (its cursor
   * `step` is 0, `useCalendarPeriod.ts`), so its prev/next arrows would be
   * controls that do nothing: a real tap producing no effect is worse than
   * no control at all. `false` removes them from the DOM entirely (not
   * just visually) rather than disabling them, so the header can never be
   * measured as having two dead buttons. Day, Week and Month all pass
   * `true`, unchanged from before this prop existed.
   */
  showArrows: boolean;
  /** True for admin/parent sessions only — a kid session renders two
   * circles, not three, and `justify-center` re-centers them automatically
   * (no separate layout branch needed). This is UI-only convenience: the
   * real gate is the MANAGER_ROLES check inside the write actions
   * themselves (actions/calendar.ts), same as every other manage-only
   * control in this branch. */
  canManage: boolean;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="mb-5 flex items-center justify-center gap-10">
        <ActionCircle
          icon={<CalendarCheck aria-hidden="true" size={22} />}
          label="Today"
          onClick={onToday}
          disabled={!todayResolved || isCurrentPeriod}
        />
        <ActionCircle
          icon={<CalendarRange aria-hidden="true" size={22} />}
          // The label comes from the one total `Record<CalendarPeriodView,
          // string>` the picker also reads (mission-11/C2), never a ternary
          // chain. The chain this replaced ended in a catch-all `: "Month"`,
          // so the moment C2 widened the union, Schedule / 3 Day / Year
          // would each have rendered a circle labelled "Month" with no
          // compile error — the label had been protected only by this file
          // hand-writing its own copy of the view union, which C1 correctly
          // removed. A total record makes the label a compiler-checked
          // per-view difference instead.
          label={VIEW_LABELS[view]}
          onClick={onPickView}
        />
        {canManage && (
          <ActionCircle
            icon={<Plus aria-hidden="true" size={22} />}
            label="Add"
            onClick={onAdd}
          />
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        {showArrows && (
          <button
            type="button"
            onClick={onPrev}
            disabled={prevDisabled}
            aria-label={prevLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors active:bg-surface-2 disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" size={22} />
          </button>
        )}

        {/* Pinned height: this is the one piece of the header whose CONTENT
            depends on `today` (the title text itself), so it's the one
            piece that needs the null-frame and resolved-frame to match
            exactly rather than by coincidence. The buttons on either side
            render identically regardless of `today`, so they need no such
            pinning. */}
        <span className="flex h-7 min-w-0 flex-1 items-center justify-center">
          {title === null ? (
            <span aria-hidden="true" className="h-5 w-32 animate-pulse rounded bg-surface-2" />
          ) : (
            <h2 className="truncate text-lg font-semibold">{title}</h2>
          )}
        </span>

        {showArrows && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            aria-label={nextLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors active:bg-surface-2 disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" size={22} />
          </button>
        )}
      </div>
    </>
  );
}
