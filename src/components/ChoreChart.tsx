"use client";

import { useOptimistic, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ChoreChartSheet } from "./ChoreChartSheet";
import { HabitIcon } from "./HabitIcon";
import { addChartChore, clearChoreChange, moveChoreThisWeek, skipChoreThisWeek } from "@/app/actions/choreChart";
import type { ChartChore, ChartWeekChore, ChartWeekDay, ChoreChartData } from "@/lib/choreChart";
import { CHORE_CHART_LABELS, CHORE_TAG_LABELS, HABIT_TITLE_MAX, type Weekday } from "@/lib/habitVocabulary";
import { SHORT_DAY_NAMES } from "@/lib/mealPlanDates";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

const CARD = "flex flex-col gap-1.5 rounded-2xl border bg-surface px-3 py-2.5";
const ROW = "flex min-h-11 w-full items-center gap-2 rounded-xl bg-accent-soft px-2.5 text-left text-fg";
const TAB_BASE = "flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-semibold";

/** What a tap does to the chart before the server has answered. */
type ChartChange =
  | { type: "add"; weekday: Weekday; name: string }
  | { type: "move"; habitId: string; from: Weekday; to: Weekday }
  | { type: "skip"; habitId: string; from: Weekday }
  | { type: "clear"; habitId: string; from: Weekday };

/** A chore's week changes undone: its moved-here copy goes, its own day shows again as required. */
function withoutChange(days: ChartWeekDay[], habitId: string, from: Weekday): ChartWeekDay[] {
  return days.map((day) => ({
    ...day,
    chores: day.chores.flatMap((chore): ChartWeekChore[] => {
      if (chore.id !== habitId || chore.fromWeekday !== from) return [chore];
      if (day.weekday !== from) return [];
      return [{ ...chore, state: "required", tag: null, changed: false }];
    }),
  }));
}

/** The chart as it should look right after `change` (the server's answer replaces it a moment later). */
function applyChartChange(chart: ChoreChartData, change: ChartChange): ChoreChartData {
  if (change.type === "add") {
    const added: ChartChore = { id: `new-${change.weekday}-${change.name}`, title: change.name, icon: null, who: null };
    return {
      ...chart,
      defaultWeek: chart.defaultWeek.map((day) => (day.weekday === change.weekday ? { ...day, chores: [...day.chores, added] } : day)),
    };
  }
  const cleared = withoutChange(chart.thisWeek.days, change.habitId, change.from);
  const days = change.type === "clear" ? cleared : cleared.map((day) => {
    if (day.weekday === change.from) {
      return {
        ...day,
        chores: day.chores.map((chore) => {
          if (chore.id !== change.habitId || chore.fromWeekday !== change.from) return chore;
          return change.type === "skip"
            ? { ...chore, state: "skipped" as const, tag: CHORE_TAG_LABELS.skipped, changed: true }
            : { ...chore, state: "moved-away" as const, tag: CHORE_TAG_LABELS.movedTo(SHORT_DAY_NAMES[change.to]), changed: true };
        }),
      };
    }
    const source = cleared.find((d) => d.weekday === change.from)?.chores.find((c) => c.id === change.habitId && c.fromWeekday === change.from);
    if (change.type !== "move" || day.weekday !== change.to || !source) return day;
    return { ...day, chores: [...day.chores, { ...source, state: "required" as const, tag: CHORE_TAG_LABELS.thisWeekOnly, changed: true }] };
  });
  return { ...chart, thisWeek: { ...chart.thisWeek, days } };
}

/** One chore line on This week; a change that is still allowed makes it a button for the sheet. */
function WeekRow({ chore, onOpen }: { chore: ChartWeekChore; onOpen: () => void }) {
  const faded = chore.state !== "required";
  const body = (
    <>
      <span className="flex shrink-0 text-accent">
        <HabitIcon name={chore.icon} kind="chore" size={18} />
      </span>
      {/* The title and its tag stack, so a narrow column keeps the whole title and the tag stays in the card. */}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 py-1">
        <span className={`w-full truncate font-medium ${faded ? "text-muted-strong" : ""}`}>{chore.title}</span>
        {chore.tag && <span className="max-w-full rounded-lg bg-surface-2 px-2 py-0.5 text-xs font-semibold leading-tight text-muted-strong">{chore.tag}</span>}
      </span>
      {chore.who && <span className="shrink-0 text-xs text-muted">{chore.who}</span>}
    </>
  );
  return chore.canChange ? (
    <button type="button" onClick={onOpen} className={ROW}>
      {body}
    </button>
  ) : (
    <div className={ROW}>{body}</div>
  );
}

/**
 * The Chore chart (decisions 116 to 119): one person's Default week, where a
 * chore is added under a day and tapped to edit, and This week, where a tap
 * opens a sheet to move or skip it for this week only. The person and the
 * tab are in the URL (`?person=`, `?view=`), so each is a real page.
 *
 * Every tap goes through `useOptimisticRun`: the change shows at once and the
 * server's error goes underneath; the page's server refresh then replaces the
 * guess with the truth. This file turns each typed change into one of its four
 * actions, and keeps the dimmed "new-" rows (a chore not yet saved) to itself.
 */
export function ChoreChart({ chart, view }: { chart: ChoreChartData; view: "default" | "week" }) {
  const [live, applyOptimistic] = useOptimistic<ChoreChartData, ChartChange>(chart, applyChartChange);
  const [adding, setAdding] = useState<Weekday | null>(null);
  const [name, setName] = useState("");
  const [open, setOpen] = useState<{ chore: ChartWeekChore; column: Weekday } | null>(null);
  const { run, error } = useOptimisticRun(applyOptimistic);

  function send(change: ChartChange) {
    run(change, () =>
      change.type === "add"
        ? addChartChore(chart.personId, change.weekday, change.name)
        : change.type === "move"
          ? moveChoreThisWeek(chart.personId, change.habitId, change.from, change.to)
          : change.type === "skip"
            ? skipChoreThisWeek(chart.personId, change.habitId, change.from)
            : clearChoreChange(chart.personId, change.habitId, change.from),
    );
  }

  const href = (person: string, next: "default" | "week") => `/habits/chart?person=${person}&view=${next}`;
  const tabs = [
    { key: "default" as const, label: CHORE_CHART_LABELS.defaultWeek },
    { key: "week" as const, label: `${CHORE_CHART_LABELS.thisWeek}, ${formatRange(live.thisWeek.start, live.thisWeek.end)}` },
  ];

  function save(weekday: Weekday) {
    const trimmed = name.trim();
    if (!trimmed) return;
    send({ type: "add", weekday, name: trimmed });
    setAdding(null);
    setName("");
  }

  return (
    <div>
      <nav aria-label="Whose chart" className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
        {live.chips.map((chip) => (
          <Link
            key={chip.id}
            href={href(chip.id, view)}
            aria-current={chip.selected ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
              chip.selected ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-muted"
            }`}
          >
            {chip.name}
          </Link>
        ))}
      </nav>

      <nav aria-label="Chart views" className="mb-3 flex gap-1 rounded-2xl bg-surface-2 p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={href(live.personId, tab.key)}
            aria-current={tab.key === view ? "page" : undefined}
            className={`${TAB_BASE} ${tab.key === view ? "bg-surface text-fg shadow-sm" : "text-muted-strong"}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {view === "week" && <p className="mb-3 text-sm text-muted">Changes here are for this week only. Next week starts from the default again.</p>}

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}

      {/* One container round the day cards (STRUCTURE.md "Wide pages"): 1 column, 2 from 36rem, 7 from 64rem. The sheet below stays outside it. */}
      <div className="@container">
      <div className="grid grid-cols-1 gap-3 @min-[36rem]:grid-cols-2 @min-[64rem]:grid-cols-7">
        {view === "default"
          ? live.defaultWeek.map((day) => (
              <section key={day.weekday} className={`@container min-w-0 ${CARD} border-line`}>
                <h2 className="font-bold">{day.name}</h2>
                {day.chores.map((chore) =>
                  chore.id.startsWith("new-") ? (
                    <div key={chore.id} className={`${ROW} opacity-60`}>
                      <HabitIcon name={chore.icon} kind="chore" size={18} />
                      <span className="min-w-0 flex-1 truncate font-medium">{chore.title}</span>
                    </div>
                  ) : (
                    <Link key={chore.id} href={`/habits/${chore.id}/edit`} className={ROW}>
                      <span className="flex shrink-0 text-accent">
                        <HabitIcon name={chore.icon} kind="chore" size={18} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col items-start py-1">
                        <span className="w-full truncate font-medium">{chore.title}</span>
                        {chore.who && <span className="text-xs text-muted">{chore.who}</span>}
                      </span>
                    </Link>
                  ),
                )}
                {adding === day.weekday ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      save(day.weekday);
                    }}
                    className="flex flex-col gap-2 @min-[12rem]:flex-row"
                  >
                    <input
                      type="text"
                      value={name}
                      maxLength={HABIT_TITLE_MAX}
                      onChange={(event) => setName(event.target.value)}
                      autoFocus
                      aria-label={`Chore name for ${day.name}`}
                      className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 text-base text-fg"
                    />
                    <button type="submit" disabled={!name.trim()} className="min-h-12 shrink-0 rounded-full bg-accent px-5 text-sm font-semibold text-accent-fg disabled:opacity-50">
                      Save
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    aria-label={`Add a chore on ${day.name}`}
                    onClick={() => {
                      setAdding(day.weekday);
                      setName("");
                    }}
                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-sm font-medium text-muted"
                  >
                    <Plus aria-hidden="true" size={16} />
                    Add
                  </button>
                )}
              </section>
            ))
          : live.thisWeek.days.map((day) => (
              <section key={day.weekday} className={`@container min-w-0 ${CARD} ${day.isToday ? "border-2 border-accent" : "border-line"}`}>
                <h2 className="font-bold">
                  {day.name}
                  {day.isToday && <span className="ml-2 text-xs font-semibold text-accent">TODAY</span>}
                </h2>
                {day.chores.length === 0 && <p className="text-sm text-muted">Nothing this day.</p>}
                {day.chores.map((chore) => (
                  <WeekRow key={`${chore.id}-${chore.fromWeekday}`} chore={chore} onOpen={() => setOpen({ chore, column: day.weekday })} />
                ))}
              </section>
            ))}
      </div>
      </div>

      {open && (
        <ChoreChartSheet
          chore={open.chore}
          column={open.column}
          onMove={(to) => {
            send({ type: "move", habitId: open.chore.id, from: open.chore.fromWeekday, to: to as Weekday });
            setOpen(null);
          }}
          onSkip={() => {
            send({ type: "skip", habitId: open.chore.id, from: open.chore.fromWeekday });
            setOpen(null);
          }}
          onClear={() => {
            send({ type: "clear", habitId: open.chore.id, from: open.chore.fromWeekday });
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

/** "Nov 1 to 7", or "Oct 30 to Nov 5" across a month, from two "YYYY-MM-DD" days. */
function formatRange(start: string, end: string): string {
  const month = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const date = (day: string) => Number(day.slice(8));
  return month(start) === month(end)
    ? `${month(start)} ${date(start)} to ${date(end)}`
    : `${month(start)} ${date(start)} to ${month(end)} ${date(end)}`;
}
