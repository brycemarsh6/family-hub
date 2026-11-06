"use client";

import { useOptimistic, useState } from "react";
import Link from "next/link";
import { Flame, Moon, Plane, Sun, Sunset } from "lucide-react";
import { ChoreShoutOutCard } from "./ChoreShoutOutCard";
import { EmptyState } from "./EmptyState";
import { HabitFilterChips, type HabitFilterOption } from "./HabitFilterChips";
import { HabitConfetti } from "./HabitConfetti";
import { HabitRow } from "./HabitRow";
import { habitRowTaps } from "./HabitsTile";
import { NudgeCards } from "./NudgeCard";
import { PlanDayCards } from "./PlanDayCard";
import { lifeAreaInfo, toLifeArea } from "@/lib/goalVocabulary";
import { applyHabitChange, type HabitChange } from "@/lib/habitChanges";
import type { HabitRowView, TodayNudge, TodayPrompt } from "@/lib/habitsRead";
import { doneCountLabel } from "@/lib/habitsFamily";
import { allRequiredDoneToday } from "@/lib/habitsToday";
import { formatShortCalendarDate, parseDateParam } from "@/lib/householdDate";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import { isExcused } from "@/lib/habits/weekOverrides";
import { TIMES_OF_DAY, TIME_OF_DAY_LABELS, VACATION_TODAY_LABEL, streakLabel, vacationThroughLabel } from "@/lib/habitVocabulary";

const TIME_ICONS = { morning: Sun, afternoon: Sunset, evening: Moon } as const;

const ALL = "all";

/** Finished means checked or excused (skipped, on vacation, skipped this week): those sink to the bottom when the page loads. */
function isFinished(row: HabitRowView) {
  return row.doneToday || isExcused(row);
}

export function HabitTodayList({
  rows,
  todayLabel,
  canManage,
  nudges,
  confetti,
  showStreaks,
  todayKey,
  choreStreak,
  shoutOut,
  vacationThrough,
  prompts = [],
}: {
  rows: HabitRowView[];
  /** "Thursday, Nov 5", made on the server so the browser agrees with it. */
  todayLabel: string;
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
}) {
  // A copy of the rows that is updated the instant a button is tapped, then
  // replaced by the server's real answer (the same idea as ThisWeekList).
  const [live, applyOptimistic] = useOptimistic<HabitRowView[], HabitChange>(rows, applyHabitChange);
  const { run, error } = useOptimisticRun(applyOptimistic);
  const [filter, setFilter] = useState(ALL);
  // Done rows move to the bottom once, when the page loads. A tap must not
  // make a row jump away from under the finger, so the order is fixed here
  // and later rows (none expected) simply go last.
  const [order] = useState(() => [...rows].sort((a, b) => Number(isFinished(a)) - Number(isFinished(b))).map((row) => row.id));
  const rank = (row: HabitRowView) => {
    const at = order.indexOf(row.id);
    return at === -1 ? order.length : at;
  };
  const ordered = [...live].sort((a, b) => rank(a) - rank(b));

  // Which chips to offer: only the times of day and life areas that rows actually use.
  const options: HabitFilterOption[] = [{ key: ALL, label: "All" }];
  for (const time of TIMES_OF_DAY) {
    if (live.some((row) => row.timeOfDay === time)) {
      options.push({ key: `time:${time}`, label: TIME_OF_DAY_LABELS[time], icon: TIME_ICONS[time] });
    }
  }
  const areas = new Set<string>();
  for (const row of live) {
    const area = toLifeArea(row.lifeArea);
    if (area) areas.add(area);
  }
  for (const area of areas) options.push({ key: `area:${area}`, label: lifeAreaInfo(toLifeArea(area)!).short });
  // If the chosen chip's last row went away (the server refreshed), show everything again.
  const active = options.some((option) => option.key === filter) ? filter : ALL;

  const shown = ordered.filter((row) => {
    if (active === ALL) return true;
    return active.startsWith("time:") ? `time:${row.timeOfDay}` === active : `area:${row.lifeArea}` === active;
  });
  const sections = [
    { key: "habit", title: "Habits", rows: shown.filter((row) => row.kind === "habit") },
    { key: "chore", title: "Chores", rows: shown.filter((row) => row.kind === "chore") },
  ].filter((section) => section.rows.length > 0);

  const throughDay = vacationThrough ? parseDateParam(vacationThrough) : null;

  return (
    <div>
      {/* The flag is the server's on load; after a tap it is worked out again from the tapped rows, by the same rule. */}
      <HabitConfetti fire={confetti || allRequiredDoneToday(live)} today={todayKey} />
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
      <PlanDayCards prompts={prompts} />
      <p className="mb-3 text-sm text-muted">
        {todayLabel}
        {live.length > 0 && ` · ${doneCountLabel(live)}`}
      </p>

      {live.length > 0 && options.length > 1 && <HabitFilterChips options={options} value={active} onChange={setFilter} />}

      {error && (
        <p role="alert" className="mb-3 text-sm text-warn">
          {error}
        </p>
      )}

      {live.length === 0 ? (
        <div>
          <EmptyState
            emoji="🌱"
            title="Nothing to do today"
            hint={canManage ? "Add a habit or a chore to see it here" : "Nothing is due right now"}
          />
          {canManage && (
            <Link
              href="/habits/new"
              className="mt-3 flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-base font-semibold text-accent-fg"
            >
              Add a habit or chore
            </Link>
          )}
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">Nothing here today.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <section key={section.key}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
                  {section.title}
                  {section.key === "chore" && showStreaks && streakLabel(choreStreak, "days") && (
                    <span className="inline-flex items-center gap-0.5 text-sm font-semibold normal-case tracking-normal text-streak">
                      <Flame aria-hidden="true" size={14} />
                      {streakLabel(choreStreak, "days")}
                    </span>
                  )}
                </h2>
                <span className="text-sm text-muted">{doneCountLabel(section.rows)}</span>
              </div>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {section.rows.map((row) => (
                  <li key={row.id}>
                    <HabitRow row={row} showStreaks={showStreaks} {...habitRowTaps(row, run)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {live.length > 0 && <p className="mt-4 text-center text-sm text-muted">Swipe a row left to skip it for today.</p>}
    </div>
  );
}
