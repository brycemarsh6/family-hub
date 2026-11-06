"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ChevronRight, Plus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { HabitIcon } from "./HabitIcon";
import { QUIT_TAG_CLASS } from "./HabitRow";
import { SortableList } from "./SortableList";
import { reorderHabits, restoreHabit, type HabitActionResult } from "@/app/actions/habits";
import { lifeAreaInfo, toLifeArea } from "@/lib/goalVocabulary";
import {
  HABIT_SCHEDULE_SHORT_LABELS,
  TIME_OF_DAY_LABELS,
  habitWhoLabel,
  parseWeekdayMask,
  toHabitSchedule,
} from "@/lib/habitVocabulary";
import type { HabitManagerItem } from "@/lib/habitsRead";
import { FULL_DAY_NAMES, SHORT_DAY_NAMES } from "@/lib/mealPlanDates";


const CARD = "rounded-2xl border border-line bg-surface px-3";
const SECTION_HEADING = "mt-5 mb-1.5 flex items-baseline justify-between text-sm font-semibold uppercase tracking-wide text-muted";

type ManagerState = { active: HabitManagerItem[]; archived: HabitManagerItem[] };
type ManagerChange = { type: "order"; ids: string[] } | { type: "restore"; id: string };

/** Applies a change the instant it is made: a new order of the active list, or one archived row coming back at the end. */
function applyManagerChange(state: ManagerState, change: ManagerChange): ManagerState {
  if (change.type === "order") {
    const byId = new Map(state.active.map((item) => [item.id, item]));
    const ordered = change.ids.flatMap((id) => byId.get(id) ?? []);
    return { ...state, active: ordered };
  }
  const restored = state.archived.find((item) => item.id === change.id);
  if (!restored) return state;
  return {
    active: [...state.active, { ...restored, archived: false }],
    archived: state.archived.filter((item) => item.id !== change.id),
  };
}

/** "Every day", "Wednesdays", "Mon, Wed, Fri", "3 times a week": the schedule in words. */
function scheduleText(item: HabitManagerItem): string {
  const schedule = toHabitSchedule(item.schedule);
  if (schedule === "weekdays") {
    const days = parseWeekdayMask(item.weekdays) ?? [];
    if (days.length === 1) return `${FULL_DAY_NAMES[days[0]]}s`;
    if (days.length > 1) return days.map((day) => SHORT_DAY_NAMES[day]).join(", ");
  }
  if (schedule === "weekly" && item.times) return `${item.times} ${item.times === 1 ? "time" : "times"} a week`;
  if (schedule === "monthly" && item.times) return `${item.times} ${item.times === 1 ? "time" : "times"} a month`;
  return HABIT_SCHEDULE_SHORT_LABELS[schedule];
}

/** The small grey line under a title: schedule, who, time of day, life area, carry-over. */
function detailLine(item: HabitManagerItem): string {
  const parts = [scheduleText(item)];
  const people = item.participantIds.length;
  if (people > 1) parts.push(habitWhoLabel({ people, everyone: item.everyone, sharing: item.sharing }));
  if (item.timeOfDay) parts.push(TIME_OF_DAY_LABELS[item.timeOfDay]);
  const area = toLifeArea(item.lifeArea);
  if (area) parts.push(lifeAreaInfo(area).short);
  if (item.carryOver) parts.push("Carries over");
  return parts.join(" · ");
}

function RowBody({ item }: { item: HabitManagerItem }) {
  return (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <HabitIcon name={item.icon} kind={item.kind} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-base font-semibold">{item.title}</span>
          {item.mode === "quit" && <span className={QUIT_TAG_CLASS}>Quit</span>}
        </div>
        <span className="text-sm text-muted">{detailLine(item)}</span>
      </div>
    </>
  );
}

/**
 * The manager: your habits and chores in your own order (drag the grip), tap a
 * row to edit it, and an Archived list with Restore. Habits and Chores are two
 * lists, but the saved order is one list: a drag only reshuffles the slots its
 * own list already held, so the Today order of the other kind never moves.
 * Reordering and restoring show at once and are put right if the save fails.
 */
export function HabitManager({ active, archived }: { active: HabitManagerItem[]; archived: HabitManagerItem[] }) {
  const [state, applyOptimistic] = useOptimistic<ManagerState, ManagerChange>({ active, archived }, applyManagerChange);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(change: ManagerChange, action: () => Promise<HabitActionResult>) {
    setError(null);
    startTransition(async () => {
      applyOptimistic(change);
      try {
        const result = await action();
        if (result.error) setError(result.error);
      } catch {
        // The call never reached the server (network down): say so here instead of the error page.
        setError("Couldn't save that. Check your connection and try again.");
      }
    });
  }

  function reorderWithin(kind: HabitManagerItem["kind"], groupIds: string[]) {
    // Put the group's new order into the slots the group held in the full list.
    const queue = [...groupIds];
    const ids = state.active.map((item) => (item.kind === kind ? (queue.shift() ?? item.id) : item.id));
    run({ type: "order", ids }, () => reorderHabits(ids));
  }

  const groups = [
    { kind: "habit" as const, heading: "Habits", items: state.active.filter((item) => item.kind === "habit") },
    { kind: "chore" as const, heading: "Chores", items: state.active.filter((item) => item.kind === "chore") },
  ];

  return (
    <div>
      <Link
        href="/habits/new"
        className="mt-4 inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg"
      >
        <Plus aria-hidden="true" size={18} />
        Add a habit or chore
      </Link>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}

      {state.active.length === 0 && (
        <div className="mt-5">
          <EmptyState emoji="🌱" title="Nothing here yet" hint="Add a habit or chore to start your list." />
        </div>
      )}

      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <section key={group.kind}>
              <h2 className={SECTION_HEADING}>
                <span>{group.heading}</span>
                <span className="font-normal normal-case tracking-normal">{group.items.length}</span>
              </h2>
              <div className={CARD}>
                <SortableList
                  items={group.items}
                  label={(item) => item.title}
                  onReorder={(ids) => reorderWithin(group.kind, ids)}
                  className="divide-y divide-line"
                  itemClassName="flex min-h-15 items-center gap-3"
                  renderItem={(item, { grip }) => (
                    <>
                      <Link
                        href={`/habits/${item.id}/edit`}
                        className="flex min-h-15 min-w-0 flex-1 items-center gap-3 self-stretch"
                        aria-label={`Edit ${item.title}`}
                      >
                        <RowBody item={item} />
                      </Link>
                      {grip}
                    </>
                  )}
                />
              </div>
            </section>
          ),
      )}

      {state.archived.length > 0 && (
        <section>
          <h2 className={SECTION_HEADING}>
            <span className="inline-flex items-center gap-1.5">
              <Archive aria-hidden="true" size={14} />
              Archived
            </span>
            <span className="font-normal normal-case tracking-normal">{state.archived.length}</span>
          </h2>
          <p className="mb-1.5 text-sm text-muted">Stats kept, can be brought back.</p>
          <ul className={`${CARD} divide-y divide-line`}>
            {state.archived.map((item) => (
              <li key={item.id} className="flex min-h-15 items-center gap-3">
                <Link
                  href={`/habits/${item.id}/edit`}
                  className="flex min-h-15 min-w-0 flex-1 items-center gap-3 self-stretch"
                  aria-label={`Edit ${item.title}`}
                >
                  <RowBody item={item} />
                  <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
                </Link>
                <button
                  type="button"
                  onClick={() => run({ type: "restore", id: item.id }, () => restoreHabit(item.id))}
                  aria-label={`Restore ${item.title}`}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-semibold"
                >
                  <RotateCcw aria-hidden="true" size={16} />
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/settings" className={`${CARD} mt-5 flex min-h-15 items-center gap-3 py-1.5`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg">
          <SlidersHorizontal aria-hidden="true" size={20} />
        </div>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-semibold">My Habits &amp; Chores settings</span>
          <span className="text-sm text-muted">Show streaks and more</span>
        </span>
        <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
      </Link>
    </div>
  );
}
