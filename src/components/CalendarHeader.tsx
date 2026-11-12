"use client";

import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarRange, ChevronDown, ListFilter, Search } from "lucide-react";
import { ActionCircle } from "./ActionCircle";
import { CalendarRelinkBanner } from "./CalendarAutoPull";
import { CalendarViewRow } from "./CalendarViewRow";
import { CALENDAR_FILTER_LABELS, VIEW_LABELS, type CalendarPeriodView } from "@/lib/calendarViewVocabulary";
import { VIEW_CONFIG } from "@/lib/calendarViewConfig";
import { shortMonthHeading } from "@/lib/mealPlanDates";
import { HAMBURGER_ROW_HEIGHT } from "@/lib/appChrome";
import { CALENDAR_VIEW_CIRCLE_CLASSES } from "@/lib/gridClasses";

/**
 * mission-16/C4 — the DOM id ScheduleView.tsx portals its own scroll-driven
 * month title into (see this file's `pinned` branch, below). A plain id +
 * `createPortal`, not a prop: ScheduleView is CalendarViews.tsx's SIBLING,
 * not this component's child, so lifting "which month is topmost on
 * screen" up through CalendarViews and back down as a `title` override
 * would need a change there — and CalendarViews.tsx sits outside this
 * contract's boundary (it already owns the identical, working pattern for
 * "is today visible", `scheduleTodayVisible`/`onTodayVisibleChange`; this
 * is the same problem with no legal way to reuse that wiring). Same
 * precedent as `NavDrawer`'s own `document.body` portal, for the same root
 * reason: a value the natural parent can't hand down as a prop. Exported
 * so the contract between the two files is a named constant, not a magic
 * string duplicated in each.
 */
export const SCHEDULE_TITLE_SLOT_ID = "calendar-header-schedule-title-slot";

/**
 * This component's OWN rendered height while pinned for Schedule, NOT
 * counting the device's top safe-area inset. ScheduleView.tsx adds the
 * inset back (via `useHamburgerInsetPx()`) to know exactly where its own
 * content starts being visible, so its "which month is topmost" label
 * flips the moment a new month clears the bottom of this bar.
 *
 * 5.375rem = 0.5rem (`pt-2`, the hamburger's top offset) + 4.125rem (the
 * one row: a 2.75rem circle + 0.375rem `gap-1.5` + 1rem `leading-4` label,
 * the tallest thing in it) + 0.5rem (`pb-2`) + 0.25rem (`pb-1`) = 5.375rem.
 * Every part is rem, so the bar grows with the Text size setting, which is
 * why ScheduleView.tsx multiplies it by the live root font size (the
 * `rootPx` from `useHamburgerInsetPx()`).
 */
export const SCHEDULE_HEADER_BAR_HEIGHT_REM = 5.375;

/**
 * The Calendar's top bar, one row beside the fixed hamburger: the period
 * title (with a small arrow, opening the month panel) at the
 * left, then Today, View and Search at the right. From iPad width a row of
 * the six views replaces the View circle (a container query on this bar,
 * see `CalendarViewRow`). It owns no state; CalendarViews.tsx hands it
 * everything. Adding is the floating + CalendarViews mounts, not a circle.
 */
export function CalendarHeader({
  view,
  onPickView,
  onSelectView,
  todayResolved,
  isCurrentPeriod,
  onToday,
  title,
  onToggleMonthPanel,
  monthPanelOpen,
  filterCount,
  onOpenFilter,
}: {
  view: CalendarPeriodView;
  /** Opens the view picker sheet (the circle). */
  onPickView: () => void;
  /** Picks a view directly (the row of six). */
  onSelectView: (view: CalendarPeriodView) => void;
  /** False while useToday() hasn't resolved yet — see CalendarViews.tsx. */
  todayResolved: boolean;
  isCurrentPeriod: boolean;
  onToday: () => void;
  /** Null while `today` hasn't resolved — renders a pulsing placeholder. */
  title: string | null;
  /** Opens or closes the month panel (`MonthJumpPanel.tsx`, mounted by CalendarViews.tsx). */
  onToggleMonthPanel: () => void;
  monthPanelOpen: boolean;
  /** How many people and calendars are hidden by the filter (0 = none); the Filter circle shows it. */
  filterCount: number;
  onOpenFilter: () => void;
}) {
  // Schedule is the one view whose content scrolls far enough for "which
  // month is on screen" to change, so only it pins (and portals its own
  // scroll-driven title in). Read from the record, not a `view ===` test.
  const pinned = VIEW_CONFIG[view].pinned;
  const router = useRouter();

  // mission-23 — the bar shares the floating hamburger's row (top left), so
  // the wrapper is lifted by that row's height. The page's own `py-2`
  // supplies the 0.5rem top offset. Pinned, the wrapper starts at the very
  // top and carries the safe-area inset (and the offset) as padding, so its
  // row lands where the unpinned one does.
  const liftStyle: React.CSSProperties = pinned
    ? {
        top: 0,
        paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
        marginTop: `calc(-1 * (${HAMBURGER_ROW_HEIGHT} + 0.5rem + env(safe-area-inset-top)))`,
      }
    : { marginTop: `calc(-1 * ${HAMBURGER_ROW_HEIGHT})` };

  return (
    <>
      <div className={pinned ? "sticky z-20 -mx-4 bg-bg px-4 pb-1" : undefined} style={liftStyle}>
        {/* No visible title (Bryce's call); `sr-only` is absolutely positioned,
            so it takes no layout and the page still has its heading. */}
        <h1 className="sr-only">Calendar</h1>
        {/* The container the view row's rem threshold measures (gridClasses.ts). */}
        <div className="@container">
          <div className="flex items-start gap-2 pb-2 pl-14">
            {/* Fixed `h-11` so the null-frame and resolved-frame match. `relative`
                so the overlay button below positions against this span; the
                press fill sits on THIS span, behind the title and arrow (a fill
                on the button itself would paint over them). `min-w-0` lets a
                long title truncate, as a last resort; the title is 1.125rem on a phone
                so a short month ("Nov", `shortMonthHeading`) fits beside the four
                circles at 393px, and the full title shows from a 30rem bar
                (two spans swapped by container classes, never a JS width read);
                1.25rem from a 30rem bar. */}
            <span className="relative flex h-11 min-w-0 items-center gap-1 rounded-lg px-1 transition-colors has-[>button:active]:bg-surface-2">
              {title === null ? (
                <span aria-hidden="true" className="h-5 w-28 animate-pulse rounded bg-surface-2" />
              ) : pinned ? (
                // The pinned bar owns the one live month label for Schedule:
                // ScheduleView.tsx portals its own scroll-driven `<h2>` into
                // this node (SCHEDULE_TITLE_SLOT_ID, above). The span must stay
                // EMPTY: any fallback child would sit beside the portaled one
                // and show a double label. `title` is unused in this branch.
                <span
                  id={SCHEDULE_TITLE_SLOT_ID}
                  className="flex min-w-0 items-center [&_h2]:text-lg [&_h2]:font-bold @min-[30rem]:[&_h2]:text-xl"
                />
              ) : (
                <>
                  <h2 className="truncate text-lg font-bold @min-[30rem]:hidden">{shortMonthHeading(title)}</h2>
                  <h2 className="hidden truncate text-xl font-bold @min-[30rem]:block">{title}</h2>
                </>
              )}

              {/* A visible hint that the title opens the month panel (turned up while open, instant under reduce motion); a
                  sibling of the branches above (never inside the portal slot),
                  dimmed with them while `today` hasn't resolved. */}
              <ChevronDown
                aria-hidden="true"
                size={18}
                className={`shrink-0 text-muted transition-transform ${title === null ? "opacity-40" : ""} ${monthPanelOpen ? "rotate-180" : ""}`}
              />

              {/* The control every view toggles the month panel from: an
                  overlay on the whole span (44px tall, the span's own height),
                  a sibling of the branches above so the Schedule slot stays
                  childless. Disabled until `today` resolves: there is no anchor
                  to frame the panel on before then. */}
              <button
                type="button"
                onClick={onToggleMonthPanel}
                disabled={!todayResolved}
                aria-label="Jump to a month or day"
                aria-expanded={monthPanelOpen}
                className="absolute inset-0 z-10"
              />
            </span>

            <div className="ml-auto flex shrink-0 items-start gap-2">
              <ActionCircle
                icon={<CalendarCheck aria-hidden="true" size={20} />}
                label="Today"
                onClick={onToday}
                disabled={!todayResolved || isCurrentPeriod}
                size="sm"
              />
              <div className={CALENDAR_VIEW_CIRCLE_CLASSES}>
                <ActionCircle
                  icon={<CalendarRange aria-hidden="true" size={20} />}
                  // The label comes from the one total `VIEW_LABELS` record the
                  // picker also reads, never a ternary chain.
                  label={VIEW_LABELS[view]}
                  onClick={onPickView}
                  size="sm"
                />
              </div>
              <CalendarViewRow view={view} onSelectView={onSelectView} />
              <ActionCircle
                icon={<Search aria-hidden="true" size={20} />}
                label="Search"
                onClick={() => router.push("/calendar/search")}
                size="sm"
              />
              <ActionCircle
                icon={<ListFilter aria-hidden="true" size={20} />}
                label={filterCount > 0 ? CALENDAR_FILTER_LABELS.buttonOn : CALENDAR_FILTER_LABELS.button}
                onClick={onOpenFilter}
                size="sm"
                badge={filterCount}
                active={filterCount > 0}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Outside the sticky bar on purpose: it scrolls away with the list (Bryce, 2026-11-09). */}
      <CalendarRelinkBanner />
    </>
  );
}
