"use client";

import { useOptimistic } from "react";
import { Flame } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { HabitIcon } from "./HabitIcon";
import { HabitMonthCalendar, type CalendarCell } from "./HabitMonthCalendar";
import { HabitSideBySide } from "./HabitSideBySide";
import { HabitWeekStrips } from "./HabitWeekStrips";
import { NudgeButton } from "./NudgeButton";
import { checkHabit, uncheckHabit } from "@/app/actions/habitChecks";
import type { HabitStatsData } from "@/lib/habitsFamily";
import { parseDateParam } from "@/lib/householdDate";
import { NUDGE_STATUS_LABEL } from "@/lib/habitVocabulary";
import { effectiveState, statsMonthTitle } from "@/lib/habitsStats";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

const SECTION_TITLE = "text-sm font-semibold uppercase tracking-wide text-muted";

/** A tapped day's new look; an undone day goes back to "today" or "missed" until the server answers. */
type CellChange = { day: string; checked: boolean };

function applyCellChange(cells: CalendarCell[], change: CellChange, today: string): CalendarCell[] {
  return cells.map((cell) => {
    if (cell.day !== change.day) return cell;
    const state = change.checked ? "done" : cell.day === today ? "today" : "missed";
    return { ...cell, state };
  });
}

const isChecked = (cell: CalendarCell) => cell.state === "done" || cell.state === "late";

function Tile({ value, label, flame = false }: { value: number; label: string; flame?: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-2xl border border-line bg-surface p-2.5">
      <span className="flex items-center gap-1 text-[22px] font-bold">
        {flame && <Flame aria-hidden="true" size={16} className="text-streak" />}
        {value}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

/**
 * The stats page body (decisions 94, 97, 104): header, nudge rows, tiles, the
 * month with its perfect-days line, and for Side by side habits the table and
 * the week strips. The data is plain values from `loadHabitStats`. A tapped day
 * changes at once (the same `useOptimistic` idiom as the Today list), and the
 * tile total follows; the streak numbers wait for the server.
 */
export function HabitStats({ data }: { data: HabitStatsData }) {
  const [cells, applyOptimistic] = useOptimistic<CalendarCell[], CellChange>(data.calendar.cells, (current, change) =>
    applyCellChange(current, change, data.today),
  );
  const { run, error } = useOptimisticRun(applyOptimistic);

  function toggle(cell: CalendarCell) {
    if (!data.canTap) return;
    const undo = isChecked(cell);
    run({ day: cell.day, checked: !undo }, () => (undo ? uncheckHabit : checkHabit)(data.habit.id, data.subjectId, cell.day));
  }

  const checkedNow = cells.filter(isChecked).length;
  const checkedOnServer = data.calendar.cells.filter(isChecked).length;
  const total = data.tiles.total + (checkedNow - checkedOnServer);
  const dueSoFar = checkedNow + cells.filter((cell) => effectiveState(cell) === "missed").length;
  const first = parseDateParam(data.calendar.first)!;
  const colors = new Map(data.sideBySide?.rows.map((row) => [row.userId, row.avatarColor]));
  const meta = [data.habit.whoLabel, data.habit.scheduleLabel, data.habit.archived ? "Archived" : null].filter(Boolean).join(" · ");
  const unit = data.tiles.unit;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <HabitIcon name={data.habit.icon} kind={data.habit.kind} />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight">{data.habit.title}</h1>
          <span className="text-sm text-muted">{meta}</span>
        </div>
      </div>

      {data.nudgeable.map((person) => (
        <div key={person.userId} className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface p-3">
          <AvatarBadge displayName={person.displayName} avatarColor={colors.get(person.userId) ?? ""} size={28} />
          <span className="flex-1 text-sm">
            {person.displayName} · <span className="text-muted">{NUDGE_STATUS_LABEL}</span>
          </span>
          <NudgeButton habitId={data.habit.id} toUserId={person.userId} toName={person.displayName} alreadyNudged={person.nudged} />
        </div>
      ))}

      {data.subjectId !== data.viewerId && <p className="text-sm text-muted">Showing {data.subjectName}’s numbers.</p>}
      <div className="flex gap-2">
        <Tile value={data.tiles.current} label={`Current streak, ${unit}`} flame />
        <Tile value={data.tiles.best} label={`Best streak, ${unit}`} />
        <Tile value={total} label="Total done" />
      </div>

      <div className="mt-1 flex items-baseline justify-between">
        <h2 className={SECTION_TITLE}>{statsMonthTitle(first.year, first.month, parseDateParam(data.today)!.year)}</h2>
        <span className="text-sm text-muted">
          {checkedNow} of {dueSoFar} so far
        </span>
      </div>
      <HabitMonthCalendar cells={cells} leading={data.calendar.leading} today={data.today} onToggle={toggle} />
      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}
      <p className="text-sm text-muted">
        {data.perfectDays} perfect {data.perfectDays === 1 ? "day" : "days"} this month
      </p>

      {data.sideBySide && (
        <>
          <h2 className={`mt-1 ${SECTION_TITLE}`}>Side by side</h2>
          <HabitSideBySide rows={data.sideBySide.rows} unit={unit} />
          <HabitWeekStrips weeks={data.sideBySide.weekly.weeks} people={data.sideBySide.weekly.people} />
        </>
      )}
    </div>
  );
}
