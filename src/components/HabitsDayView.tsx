"use client";

import { useState, type ReactNode } from "react";
import { HabitFamilyView } from "./HabitFamilyView";
import { HabitFilterSheet } from "./HabitFilterSheet";
import { withTimeIcons } from "./HabitFilterChips";
import { HabitTodayList } from "./HabitTodayList";
import { HabitsBar } from "./HabitsBar";
import type { FamilyPage } from "@/lib/habitsFamily";
import { habitsHref } from "@/lib/habitsDay";
import type { TodayPage } from "@/lib/habitsRead";
import type { HabitRowView } from "@/lib/habitsToday";
import { REPORT_FILTER_ALL, activeReportFilter, matchesHabitsFilter, narrowedFilterCount, reportFilterOptions, stillHiddenPeople } from "@/lib/habitsReportScope";

/**
 * The one client owner of the Habits page (mission 51): the Filter state (time
 * of day, Together only, who), the sheet, and the bar. Each list draws the bar
 * itself through `bar(subtitle)`, so the "2 of 7 done" under the date follows
 * the list's live rows. The filter is a plain `keep` test both lists share.
 * A past day passes `readOnly` down: markers instead of buttons.
 */
export function HabitsDayView({
  mine,
  family,
  day,
  todayKey,
  dateLabel,
  prev,
  next,
  canManage,
  showStreaks,
  focusPersonId,
}: {
  /** Exactly one of these is set: the Mine page or the Whole family page. */
  mine: TodayPage | null;
  family: FamilyPage | null;
  /** The shown day, "YYYY-MM-DD"; a past day is read only. */
  day: string;
  todayKey: string;
  /** "Friday, November 7", made on the server so the browser agrees with it. */
  dateLabel: string;
  prev: string | null;
  next: string | null;
  /** False on the wall tablet: no Manage, Report or Show group. */
  canManage: boolean;
  /** The viewer's switch (always true on the tablet); the list hides streaks on a past day itself. */
  showStreaks: boolean;
  focusPersonId?: string;
}) {
  const [timeKey, setTimeKey] = useState(REPORT_FILTER_ALL);
  const [togetherOnly, setTogetherOnly] = useState(false);
  const [hiddenPeople, setHiddenPeople] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const isToday = day === todayKey;
  const readOnly = !isToday;
  const isFamily = family !== null;
  const rows: HabitRowView[] = family ? [...family.columns.flatMap((column) => column.rows), ...family.together] : (mine?.rows ?? []);
  const timeOptions = withTimeIcons(reportFilterOptions(rows, { kinds: false, areas: false }));
  const time = activeReportFilter(timeOptions, timeKey);
  const people = family ? family.columns.map(({ id, displayName, avatarColor }) => ({ id, displayName, avatarColor })) : [];
  const hidden = stillHiddenPeople(hiddenPeople, people);

  const keep = (row: HabitRowView) => matchesHabitsFilter(row, { time, togetherOnly });
  const narrowed = narrowedFilterCount({ time, togetherOnly, hiddenPeople: hidden });
  const dayParam = (target: string | null) => (target && target !== todayKey ? target : null);
  const hrefFor = (family: boolean, target: string | null) => habitsHref({ family, day: dayParam(target), person: focusPersonId });

  const bar = (subtitle: ReactNode) => (
    <HabitsBar
      dateLabel={dateLabel}
      subtitle={subtitle}
      isToday={isToday}
      filterCount={narrowed}
      onFilter={() => setSheetOpen(true)}
      prevHref={prev ? hrefFor(isFamily, prev) : null}
      nextHref={next ? hrefFor(isFamily, next) : null}
      todayHref={hrefFor(isFamily, null)}
      canManage={canManage}
    />
  );

  return (
    <>
      {family ? (
        <HabitFamilyView
          key={day}
          page={family}
          showStreaks={showStreaks && !readOnly}
          focusPersonId={focusPersonId}
          keep={keep}
          hiddenPeople={hidden}
          readOnly={readOnly}
          bar={bar}
        />
      ) : (
        mine && (
          <HabitTodayList
            key={day}
            rows={mine.rows}
            canManage={canManage}
            // A past day is a look back: no nudges, confetti, shout-out, vacation banner or Pick a day.
            nudges={readOnly ? [] : mine.nudges}
            confetti={readOnly ? false : mine.confetti}
            choreStreak={mine.choreStreak}
            shoutOut={readOnly ? false : mine.shoutOut}
            vacationThrough={readOnly ? null : mine.vacationThrough}
            prompts={readOnly ? [] : mine.prompts}
            showStreaks={showStreaks && !readOnly}
            todayKey={todayKey}
            keep={keep}
            readOnly={readOnly}
            bar={bar}
          />
        )
      )}
      {sheetOpen && (
        <HabitFilterSheet
          family={isFamily}
          showViews={canManage}
          mineHref={hrefFor(false, day)}
          familyHref={hrefFor(true, day)}
          timeOptions={timeOptions}
          timeValue={time}
          onTime={setTimeKey}
          togetherOnly={togetherOnly}
          onTogetherOnly={setTogetherOnly}
          people={people}
          hiddenPeople={hidden}
          onTogglePerson={(id) => setHiddenPeople((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]))}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
