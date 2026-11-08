"use client";

import { useEffect, useOptimistic, useRef, useState, type ReactNode } from "react";
import { HoursLogSheet } from "./HoursLogSheet";
import { HabitFamilyColumn } from "./HabitFamilyColumn";
import { HabitFamilyWide } from "./HabitFamilyWide";
import { checkHabit, uncheckHabit } from "@/app/actions/habitChecks";
import { applyHabitChange, type HabitChange } from "@/lib/habitChanges";
import type { FamilyPage, FamilyRow } from "@/lib/habitsFamily";
import { formatCalendarDate } from "@/lib/householdDate";
import { shownColumns } from "@/lib/habitsReportScope";
import { HABITS_VIEW_LABELS } from "@/lib/habitVocabulary";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

/** A tap applied to every place the habit shows: each Together row and each column (an Each habit's `userId` keeps it to one person's own flags). */
function applyToPage(page: FamilyPage, change: HabitChange): FamilyPage {
  return {
    ...page,
    together: applyHabitChange(page.together, change),
    columns: page.columns.map((column) => ({ ...column, rows: applyHabitChange(column.rows, change) })),
  };
}

/** A past day (mission 53): nobody can tick anything, and the Sunday shout-out is not for that day. */
function lockPage(page: FamilyPage): FamilyPage {
  const lock = (row: FamilyRow): FamilyRow => ({ ...row, canLog: false });
  return { ...page, together: page.together.map(lock), columns: page.columns.map((column) => ({ ...column, shoutOut: false, rows: column.rows.map(lock) })) };
}

/** A carried row's tap is for the missed day, not today (same rule as Today). */
const dayOf = (row: FamilyRow) => (row.carriedFrom ? formatCalendarDate(row.carriedFrom) : undefined);

/**
 * The family view (decision 95): a card per person, each with its Together rows.
 * Under 45rem of room: the stacked cards (side by side where two fit). From 45rem up
 * (an iPad): `HabitFamilyWide`'s columns by time of day (mission 41, 51). The switch
 * is on the container's width, not the screen's.
 * Both layouts are rendered from this one optimistic state.
 * A tap logs for `row.logForId` through the same actions and the same optimistic
 * reducer as Today; a row the viewer may not log for has no button.
 */
export function HabitFamilyView({
  page,
  showStreaks,
  focusPersonId,
  keep,
  hiddenPeople,
  readOnly = false,
  bar,
}: {
  page: FamilyPage;
  showStreaks: boolean;
  /** `?person=<id>`: that person's column (wide) or card (stacked) scrolls into view on load. An unknown id does nothing. */
  focusPersonId?: string;
  /** The Filter sheet's test (time of day, Together only): whether a row shows. */
  keep: (row: FamilyRow) => boolean;
  /** People the Filter sheet turned off: their columns are left out. */
  hiddenPeople: string[];
  /** A past day: plain markers, no checks, no hours log. */
  readOnly?: boolean;
  /** Draws the page's bar with this view's subtitle. */
  bar: (subtitle: ReactNode) => ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [state, applyOptimistic] = useOptimistic<FamilyPage, HabitChange>(page, applyToPage);
  const { run, error, setError, pending } = useOptimisticRun(applyOptimistic);
  const live = readOnly ? lockPage(state) : state;
  // What the Filter sheet leaves: its people. Each layout filters its own rows with `keep`, so "x of y done" stays the whole day.
  const columns = shownColumns(live.columns, hiddenPeople);
  // The hours row whose log sheet is open: the habit and the person, read live so bars move as soon as Add is tapped.
  const [logging, setLogging] = useState<{ habitId: string; userId: string } | null>(null);
  const loggingRow = logging ? live.columns.flatMap((column) => column.rows).find((row) => row.id === logging.habitId && row.logForId === logging.userId && row.hours) : undefined;

  // Both layouts are in the page; the hidden one has no box, so scrolling it does nothing.
  useEffect(() => {
    if (!focusPersonId) return;
    for (const el of root.current?.querySelectorAll<HTMLElement>("[data-family-person]") ?? []) {
      if (el.dataset.familyPerson === focusPersonId) el.scrollIntoView({ inline: "start", block: el.dataset.layout === "wide" ? "nearest" : "start" });
    }
  }, [focusPersonId]);

  function toggle(row: FamilyRow) {
    if (readOnly) return;
    if (row.hours) {
      setError(null);
      return setLogging({ habitId: row.id, userId: row.logForId });
    }
    const change = { habitId: row.id, userId: row.logForId };
    if (row.doneToday) run({ ...change, type: "uncheck" }, () => uncheckHabit(row.id, row.logForId, dayOf(row)));
    else run({ ...change, type: "check" }, () => checkHabit(row.id, row.logForId, dayOf(row)));
  }

  return (
    <div ref={root} className="flex flex-col gap-3.5 md:min-h-0 md:flex-1">
      {bar(HABITS_VIEW_LABELS.family)}
      {error && !loggingRow && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}
      {/* One container round both layouts decides which shows. 45rem and the chrome's `md` frame switch together: a 768 screen leaves a 736px container (the Sidebar pins only from 1024, which leaves 736 too), over 720. The sheet below stays outside (STRUCTURE.md, Wide pages, rule 1). */}
      <div className="@container flex flex-col gap-3.5 md:min-h-0 md:flex-1">
        <div className="flex flex-col gap-3.5 @min-[45rem]:hidden">
          {columns.length === 0 ? (
            <p className="text-sm text-muted">No one to show yet.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-3.5">
              {columns.map((column) => (
                <HabitFamilyColumn key={column.id} column={column} together={live.together} showStreaks={showStreaks} keep={keep} onToggle={toggle} />
              ))}
            </div>
          )}
        </div>
        <HabitFamilyWide page={{ ...live, columns }} showStreaks={showStreaks} keep={keep} onToggle={toggle} />
      </div>
      {loggingRow?.hours && (
        <HoursLogSheet
          habitId={loggingRow.id}
          title={loggingRow.title}
          hours={loggingRow.hours}
          forUserId={loggingRow.logForId}
          forName={loggingRow.participants.find((p) => p.userId === loggingRow.logForId)?.displayName}
          run={run}
          pending={pending}
          error={error}
          onEdit={() => setError(null)}
          onClose={() => setLogging(null)}
        />
      )}
    </div>
  );
}
