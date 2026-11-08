"use client";

import { useOptimistic, useState, type ReactNode } from "react";
import Link from "next/link";
import { Flame, Plane } from "lucide-react";
import { ChoreShoutOutCard } from "./ChoreShoutOutCard";
import { EmptyState } from "./EmptyState";
import { HabitConfetti } from "./HabitConfetti";
import { HabitRow } from "./HabitRow";
import { HoursLogSheet } from "./HoursLogSheet";
import { habitRowTaps } from "./HabitsTile";
import { NudgeCards } from "./NudgeCard";
import { PlanDayCard } from "./PlanDayCard";
import { applyHabitChange, type HabitChange } from "@/lib/habitChanges";
import type { HabitRowView, TodayNudge, TodayPrompt } from "@/lib/habitsRead";
import { doneCountLabel } from "@/lib/habitsFamily";
import { allRequiredDoneToday } from "@/lib/habitsToday";
import { formatShortCalendarDate, parseDateParam } from "@/lib/householdDate";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import { isExcused } from "@/lib/habits/weekOverrides";
import { HABITS_VIEW_LABELS, NOTHING_HERE_TODAY, VACATION_TODAY_LABEL, streakLabel, vacationThroughLabel } from "@/lib/habitVocabulary";

/** Finished means checked or excused (skipped, on vacation, skipped this week): those sink to the bottom when the page loads. */
function isFinished(row: HabitRowView) {
  return row.doneToday || isExcused(row);
}

export function HabitTodayList({
  rows,
  canManage,
  nudges,
  confetti,
  showStreaks,
  todayKey,
  choreStreak,
  shoutOut,
  vacationThrough,
  prompts = [],
  keep,
  readOnly = false,
  bar,
}: {
  rows: HabitRowView[];
  /** False on a shared device: it can tick things off but not add or edit. */
  canManage: boolean;
  /** The viewer's unseen nudges (decision 96). */
  nudges: TodayNudge[];
  /** The server's answer to "is everything required done?" on load (decision 76). */
  confetti: boolean;
  /** The viewer's "Show streaks" switch; true on the shared tablet (decision 98). */
  showStreaks: boolean;
  /** Today as "YYYY-MM-DD": the key for the once-a-day confetti marker. */
  todayKey: string;
  /** The viewer's chore streak, shown after the "Chores" title from 2 days (decision 120). */
  choreStreak: number;
  /** Sunday after a clean chore week (decision 122). */
  shoutOut: boolean;
  /** The last day of the vacation covering today, "YYYY-MM-DD", else null (decision 115). */
  vacationThrough: string | null;
  /** The "Pick a day" cards for habits asking for a day today (decision 39), at the top. */
  prompts?: TodayPrompt[];
  /** The Filter sheet's test (time of day, Together only): whether a row shows. */
  keep: (row: HabitRowView) => boolean;
  /** A past day: markers instead of buttons, no swipe, no hours log, no confetti (mission 51). */
  readOnly?: boolean;
  /** Draws the page's bar with this list's subtitle, so its count follows the live rows. */
  bar: (subtitle: ReactNode) => ReactNode;
}) {
  // A copy of the rows that is updated the instant a button is tapped, then
  // replaced by the server's real answer (the same idea as ThisWeekList).
  const [live, applyOptimistic] = useOptimistic<HabitRowView[], HabitChange>(rows, applyHabitChange);
  const { run, error, setError, pending } = useOptimisticRun(applyOptimistic);
  // The hours row whose log sheet is open, by id, so the sheet reads the row's live week.
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const logging = live.find((row) => row.id === loggingId && row.hours);
  // Done rows move to the bottom once, when the page loads. A tap must not
  // make a row jump away from under the finger, so the order is fixed here
  // and later rows (none expected) simply go last.
  const [order] = useState(() => [...rows].sort((a, b) => Number(isFinished(a)) - Number(isFinished(b))).map((row) => row.id));
  const rank = (row: HabitRowView) => {
    const at = order.indexOf(row.id);
    return at === -1 ? order.length : at;
  };
  const ordered = [...live].sort((a, b) => rank(a) - rank(b));

  const shown = ordered.filter(keep);
  const sections = [
    { key: "habit", title: "Habits", rows: shown.filter((row) => row.kind === "habit") },
    { key: "chore", title: "Chores", rows: shown.filter((row) => row.kind === "chore") },
  ].filter((section) => section.rows.length > 0);

  const throughDay = vacationThrough ? parseDateParam(vacationThrough) : null;
  // "Mine · 2 of 7 done · 5 days" with the chore streak's flame from 2 days (decisions 120, 237); none on a past day (the cached streak is as of a later day).
  const streak = showStreaks && !readOnly ? streakLabel(choreStreak, "days") : null;
  const subtitle = (
    <>
      {HABITS_VIEW_LABELS.mine}
      {live.length > 0 && ` · ${doneCountLabel(live)}`}
      {streak && (
        <>
          {" · "}
          <span className="inline-flex items-center gap-0.5 font-semibold text-streak">
            <Flame aria-hidden="true" size={14} />
            <span className="sr-only">chore streak </span>
            {streak}
          </span>
        </>
      )}
    </>
  );

  return (
    <div>
      {bar(subtitle)}
      {/* The flag is the server's on load; after a tap it is worked out again from the tapped rows, by the same rule. */}
      {!readOnly && <HabitConfetti fire={confetti || allRequiredDoneToday(live)} today={todayKey} />}
      <NudgeCards nudges={nudges} />
      {throughDay && (
        <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-line bg-surface py-2 pl-3 pr-1">
          <Plane aria-hidden="true" size={20} className="shrink-0 text-muted" />
          <p className="min-w-0 flex-1 text-sm font-semibold">
            {vacationThrough === todayKey ? VACATION_TODAY_LABEL : vacationThroughLabel(formatShortCalendarDate(throughDay))}
          </p>
          <Link href="/settings" className="flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold text-accent">
            Change
          </Link>
        </div>
      )}
      {shoutOut && <ChoreShoutOutCard />}
      <PlanDayCard prompts={prompts} />
      {error && !logging && (
        <p role="alert" className="mb-3 text-sm text-warn">
          {error}
        </p>
      )}

      {live.length === 0 ? (
        <div>
          <EmptyState
            emoji="🌱"
            title={readOnly ? "Nothing was due" : "Nothing to do today"}
            hint={readOnly ? "No habits or chores were due that day" : canManage ? "Add a habit or a chore to see it here" : "Nothing is due right now"}
          />
          {canManage && !readOnly && (
            <Link
              href="/habits/new"
              className="mt-3 flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-base font-semibold text-accent-fg"
            >
              Add a habit or chore
            </Link>
          )}
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">{NOTHING_HERE_TODAY}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <section key={section.key}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{section.title}</h2>
                <span className="text-sm text-muted">{doneCountLabel(section.rows)}</span>
              </div>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {section.rows.map((row) => (
                  <li key={row.id}>
                    <HabitRow row={row} showStreaks={showStreaks} readOnly={readOnly} {...habitRowTaps(row, run, (hoursRow) => {
                      setError(null);
                      setLoggingId(hoursRow.id);
                    })} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {live.length > 0 && !readOnly && <p className="mt-4 text-center text-sm text-muted">Swipe a row left to skip it for today.</p>}

      {logging?.hours && (
        <HoursLogSheet
          habitId={logging.id}
          title={logging.title}
          hours={logging.hours}
          forUserId={logging.viewerId}
          run={run}
          pending={pending}
          error={error}
          onEdit={() => setError(null)}
          onClose={() => setLoggingId(null)}
        />
      )}
    </div>
  );
}
